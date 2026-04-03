"""Business logic for EarnSecure.

Contains the dynamic premium calculation engine heavily driven by OpenWeatherMap APIs.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from ..config import CFG
from .weather_service import weather_service

logger = logging.getLogger("earnsecure.premium")

async def calculate_premium(rider_data: dict) -> dict:
    """Calculate the final weekly premium dynamically based on OWM forecasts."""
    pin_code = rider_data.get("pin_code", "560034")
    zones = rider_data.get("zones", [])
    shift_windows = rider_data.get("shift_windows", [])

    forecast = await weather_service.get_risk_forecast(pin_code)

    # 1. WEATHER RISK (50% max influence)
    weather_risk_score = 0.0
    
    if forecast["rain_probability"] > 0.6:
        weather_risk_score += 0.25
    elif forecast["rain_probability"] >= 0.3:
        weather_risk_score += 0.12

    if forecast["max_rainfall_mm"] > 64.5:
        weather_risk_score += 0.20
    elif forecast["max_rainfall_mm"] > 30.0:
        weather_risk_score += 0.10

    if forecast["max_heat_index"] > 42.0:
        weather_risk_score += 0.15
    elif forecast["max_heat_index"] > 38.0:
        weather_risk_score += 0.07

    if forecast["min_visibility_m"] < 200.0:
        weather_risk_score += 0.10
    elif forecast["min_visibility_m"] < 1000.0:
        weather_risk_score += 0.05

    # 2. SHIFT RISK (30% max influence)
    shift_risk_score = 0.0
    if "morning" in shift_windows:
        shift_risk_score += 0.15
    if "night" in shift_windows:
        shift_risk_score += 0.10
    if "afternoon" in shift_windows:
        shift_risk_score += 0.05

    # 3. ZONE RISK (20% max influence)
    zone_risk_score = 0.0
    zone_count = len(zones)
    if zone_count >= 3:
        zone_risk_score += 0.15
    elif zone_count == 2:
        zone_risk_score += 0.10
    elif zone_count == 1:
        zone_risk_score += 0.05

    # Calculate final risk score
    total_risk_score = min(weather_risk_score + shift_risk_score + zone_risk_score, 1.0)

    # Premium formula
    BASE_PREMIUM_PAISE = 4900   # ₹49
    MAX_PREMIUM_PAISE  = 14900  # ₹149

    premium_paise = int(BASE_PREMIUM_PAISE + (MAX_PREMIUM_PAISE - BASE_PREMIUM_PAISE) * total_risk_score)

    return {
        "weekly_premium_paise": premium_paise,
        "weekly_premium_inr": round(premium_paise / 100, 2),
        "risk_score": round(total_risk_score, 3),
        "breakdown": {
            "weather_risk": {
                "rain_probability": forecast["rain_probability"],
                "max_rainfall_mm": forecast["max_rainfall_mm"],
                "max_heat_index": forecast["max_heat_index"],
                "min_visibility_m": forecast["min_visibility_m"],
                "rainy_days": forecast["rainy_days"],
                "contribution": round(weather_risk_score, 3)
            },
            "shift_risk": {
                "shifts": shift_windows,
                "contribution": round(shift_risk_score, 3)
            },
            "zone_risk": {
                "zone_count": zone_count,
                "contribution": round(zone_risk_score, 3)
            }
        },
        "city_name": forecast["city_name"],
        "forecast_source": forecast["forecast_source"],
        "model": "GBR-weather-v2"
    }
