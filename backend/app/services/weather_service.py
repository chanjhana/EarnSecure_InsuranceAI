"""OpenWeatherMap integration — fetches live rain, temperature, visibility, and
forecast data used by the trigger monitor and premium engine.

Public API (free tier):
  Current weather : api.openweathermap.org/data/2.5/weather
  5-day forecast  : api.openweathermap.org/data/2.5/forecast   (3-hour steps)
  Geocoding       : api.openweathermap.org/geo/1.0/zip

All functions are synchronous (uses ``requests``) to stay consistent with the
existing codebase.  They are safe to call from FastAPI async handlers because
the network I/O is short-lived and the GIL is released during socket reads.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import requests

from ..config import CFG


# ── Data classes ────────────────────────────────────────────────────

@dataclass
class WeatherSnapshot:
    """Processed current-weather reading for a single location."""
    pincode: str
    city: str
    lat: float
    lon: float

    # Core readings
    temp_c: float                 # Celsius
    feels_like_c: float
    humidity: float               # 0-100 %
    pressure_hpa: float
    wind_speed_mps: float         # metres/second
    visibility_m: float           # metres (max 10 000)

    # Precipitation
    rain_1h_mm: float = 0.0      # rain volume last 1 h
    rain_3h_mm: float = 0.0      # rain volume last 3 h
    rain_daily_est_mm: float = 0.0  # estimated 24 h accumulation

    # Derived flags
    heat_index_c: float = 0.0    # Steadman heat-index

    # Condition label from OWM (e.g. "Rain", "Clouds", "Clear")
    condition: str = ""
    description: str = ""
    icon: str = ""

    # Timestamps
    observed_at: str = ""        # ISO-8601

    # Trigger results — filled by trigger_monitor
    triggers_fired: Dict[str, bool] = field(default_factory=dict)


@dataclass
class ForecastDay:
    """Aggregated forecast for a single calendar day."""
    date: str                     # YYYY-MM-DD
    rain_total_mm: float = 0.0
    temp_max_c: float = -999.0
    temp_min_c: float = 999.0
    heat_index_max_c: float = 0.0
    humidity_avg: float = 0.0
    visibility_min_m: float = 10_000.0
    condition: str = ""


# ── Geo-coding cache (pin → lat/lon) ───────────────────────────────
_geo_cache: Dict[str, Tuple[float, float, str]] = {}


# ── Heat-index formula (Steadman / Rothfusz regression) ─────────────

def _heat_index(temp_c: float, rh: float) -> float:
    """Compute heat-index in °C from temperature and relative humidity.

    Uses the Rothfusz regression equation recommended by NOAA.
    Falls back to simple average when conditions are mild.
    """
    if temp_c < 27.0:  # below 80 °F — HI ≈ temperature
        return temp_c

    # Rothfusz works in °F
    t = temp_c * 9.0 / 5.0 + 32.0

    hi = (
        -42.379
        + 2.04901523 * t
        + 10.14333127 * rh
        - 0.22475541 * t * rh
        - 0.00683783 * t * t
        - 0.05481717 * rh * rh
        + 0.00122874 * t * t * rh
        + 0.00085282 * t * rh * rh
        - 0.00000199 * t * t * rh * rh
    )

    # Adjustments
    if rh < 13.0 and 80.0 < t < 112.0:
        hi -= ((13.0 - rh) / 4.0) * math.sqrt((17.0 - abs(t - 95.0)) / 17.0)
    elif rh > 85.0 and 80.0 < t < 87.0:
        hi += ((rh - 85.0) / 10.0) * ((87.0 - t) / 5.0)

    return (hi - 32.0) * 5.0 / 9.0  # convert back to °C


# ── Public API ──────────────────────────────────────────────────────

class WeatherService:
    """Stateless service that wraps OpenWeatherMap free-tier endpoints."""

    OWM_BASE = "https://api.openweathermap.org/data/2.5"
    OWM_GEO  = "https://api.openweathermap.org/geo/1.0"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or CFG.OPENWEATHERMAP_API_KEY

    @property
    def is_available(self) -> bool:
        return bool(self.api_key)

    # ── Geo-coding ──────────────────────────────────────────────────

    def geocode_pincode(self, pincode: str) -> Tuple[float, float, str]:
        """Convert Indian 6-digit pin code → (lat, lon, city_name).

        Uses OpenWeatherMap Geocoding API:
            GET /geo/1.0/zip?zip={pincode},IN&appid={key}

        Results are cached in-process for the lifetime of the server.
        """
        if pincode in _geo_cache:
            return _geo_cache[pincode]

        if not self.is_available:
            raise RuntimeError("OpenWeatherMap API key not configured")

        resp = requests.get(
            f"{self.OWM_GEO}/zip",
            params={"zip": f"{pincode},IN", "appid": self.api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        lat = data["lat"]
        lon = data["lon"]
        city = data.get("name", pincode)
        _geo_cache[pincode] = (lat, lon, city)
        return lat, lon, city

    # ── Current weather ─────────────────────────────────────────────

    def get_current_weather(self, pincode: str) -> WeatherSnapshot:
        """Fetch current weather for an Indian pin code.

        OpenWeatherMap endpoint:
            GET /data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={key}

        Returns a ``WeatherSnapshot`` with all readings populated.
        """
        lat, lon, city = self.geocode_pincode(pincode)

        resp = requests.get(
            f"{self.OWM_BASE}/weather",
            params={
                "lat": lat,
                "lon": lon,
                "units": "metric",
                "appid": self.api_key,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        main = data.get("main", {})
        wind = data.get("wind", {})
        rain = data.get("rain", {})
        weather = data.get("weather", [{}])[0]

        temp_c = main.get("temp", 0.0)
        humidity = main.get("humidity", 0.0)
        rain_1h = rain.get("1h", 0.0)
        rain_3h = rain.get("3h", 0.0)
        visibility = data.get("visibility", 10_000)

        hi = _heat_index(temp_c, humidity)

        # Rough daily estimate: extrapolate 1h reading (conservative for demo)
        rain_daily_est = rain_1h * 12.0 if rain_1h else (rain_3h * 4.0 if rain_3h else 0.0)

        return WeatherSnapshot(
            pincode=pincode,
            city=city,
            lat=lat,
            lon=lon,
            temp_c=round(temp_c, 1),
            feels_like_c=round(main.get("feels_like", temp_c), 1),
            humidity=humidity,
            pressure_hpa=main.get("pressure", 0),
            wind_speed_mps=round(wind.get("speed", 0), 1),
            visibility_m=visibility,
            rain_1h_mm=round(rain_1h, 1),
            rain_3h_mm=round(rain_3h, 1),
            rain_daily_est_mm=round(rain_daily_est, 1),
            heat_index_c=round(hi, 1),
            condition=weather.get("main", ""),
            description=weather.get("description", ""),
            icon=weather.get("icon", ""),
            observed_at=datetime.now(timezone.utc).isoformat(),
        )

    # ── 5-day / 3-hour forecast ─────────────────────────────────────

    def get_forecast(self, pincode: str, days: int = 7) -> List[ForecastDay]:
        """Fetch 5-day forecast and aggregate into daily summaries.

        Each ``ForecastDay`` contains total rain, max/min temperature, max
        heat-index, and minimum visibility for that calendar day.

        ``days`` is capped at 5 (OWM free-tier limit).
        """
        lat, lon, _ = self.geocode_pincode(pincode)
        days = min(days, 5)

        resp = requests.get(
            f"{self.OWM_BASE}/forecast",
            params={
                "lat": lat,
                "lon": lon,
                "units": "metric",
                "appid": self.api_key,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        # Group 3-hour steps by date
        buckets: Dict[str, ForecastDay] = {}
        for entry in data.get("list", []):
            dt_txt = entry.get("dt_txt", "")
            date_str = dt_txt[:10]  # "YYYY-MM-DD"
            if not date_str:
                continue

            if date_str not in buckets:
                buckets[date_str] = ForecastDay(date=date_str)
            day = buckets[date_str]

            main = entry.get("main", {})
            rain = entry.get("rain", {})
            weather = entry.get("weather", [{}])[0]

            temp = main.get("temp", 0)
            humidity = main.get("humidity", 0)
            vis = entry.get("visibility", 10_000)

            day.rain_total_mm += rain.get("3h", 0.0)
            day.temp_max_c = max(day.temp_max_c, temp)
            day.temp_min_c = min(day.temp_min_c, temp)
            day.heat_index_max_c = max(day.heat_index_max_c, _heat_index(temp, humidity))
            day.visibility_min_m = min(day.visibility_min_m, vis)
            day.condition = weather.get("main", day.condition)

        # Compute average humidity per day (simplified — use the last reading)
        forecasts = sorted(buckets.values(), key=lambda d: d.date)[:days]
        for f in forecasts:
            f.rain_total_mm = round(f.rain_total_mm, 1)
            f.temp_max_c = round(f.temp_max_c, 1)
            f.temp_min_c = round(f.temp_min_c, 1)
            f.heat_index_max_c = round(f.heat_index_max_c, 1)
            f.visibility_min_m = round(f.visibility_min_m, 1)

        return forecasts

    # ── Convenience: get next-week risk summary for premium engine ──

    def get_week_risk_summary(self, pincode: str) -> Dict[str, float]:
        """Return a dict of risk signals derived from the 5-day forecast.

        Keys:
            rain_days      — count of days with rain ≥ threshold
            heat_days      — count of days with heat-index ≥ threshold
            fog_days       — count of days with visibility < threshold
            max_rain_mm    — heaviest single-day rainfall
            avg_temp_max   — average daily high
        """
        try:
            forecast = self.get_forecast(pincode, days=5)
        except Exception:
            # If the API call fails, return neutral risk signals
            return {
                "rain_days": 0,
                "heat_days": 0,
                "fog_days": 0,
                "max_rain_mm": 0.0,
                "avg_temp_max": 30.0,
            }

        rain_days = sum(1 for d in forecast if d.rain_total_mm >= CFG.RAIN_THRESHOLD_MM)
        heat_days = sum(1 for d in forecast if d.heat_index_max_c >= CFG.HEAT_INDEX_THRESHOLD_C or d.temp_max_c >= CFG.HEAT_THRESHOLD_C)
        fog_days = sum(1 for d in forecast if d.visibility_min_m < CFG.FOG_VISIBILITY_M)
        max_rain = max((d.rain_total_mm for d in forecast), default=0.0)
        avg_max = sum(d.temp_max_c for d in forecast) / max(len(forecast), 1)

        return {
            "rain_days": rain_days,
            "heat_days": heat_days,
            "fog_days": fog_days,
            "max_rain_mm": round(max_rain, 1),
            "avg_temp_max": round(avg_max, 1),
        }


# ── Module-level singleton ──────────────────────────────────────────
weather_service = WeatherService()
