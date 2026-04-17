import logging
import os
import httpx

logger = logging.getLogger("earnsecure.aqi")

CPCB_API_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
AQI_THRESHOLD = 300
OWM_AQI_MAP = {1: 25, 2: 75, 3: 150, 4: 250, 5: 350}

async def get_aqi_cpcb(city_name: str) -> dict | None:
    api_key = os.getenv("CPCB_API_KEY")
    if not api_key:
        return None
        
    try:
        url = f"{CPCB_API_URL}?api-key={api_key}&format=json&filters[city]={city_name}&limit=1&fields=city,station,pollutant_avg,last_update"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            
        records = data.get("records", [])
        if not records:
            return None
            
        aqi_value = float(records[0]["pollutant_avg"])
        return {
            "aqi": aqi_value,
            "city": records[0]["city"],
            "station": records[0]["station"],
            "last_update": records[0]["last_update"],
            "source": "cpcb_sameer"
        }
    except Exception as e:
        logger.error(f"CPCB AQI fetch failed for {city_name}: {e}")
        return None

async def get_aqi_owm_fallback(lat: float, lon: float) -> dict | None:
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        return None
        
    try:
        url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            
        owm_index = data["list"][0]["main"]["aqi"]
        mapped_aqi = OWM_AQI_MAP.get(owm_index, 50)
        
        return {
            "aqi": mapped_aqi,
            "city": f"lat:{lat},lon:{lon}",
            "station": "OpenWeatherMap",
            "source": "owm_fallback"
        }
    except Exception as e:
        logger.error(f"OWM AQI fallback failed for {lat},{lon}: {e}")
        return None

async def get_aqi_for_zone(pin_code: str, city_name: str, lat: float, lon: float) -> dict:
    result = await get_aqi_cpcb(city_name)
    if result is None:
        result = await get_aqi_owm_fallback(lat, lon)
    if result is None:
        result = {"aqi": 50.0, "city": city_name, "station": "default", "source": "default_safe"}
        
    result["threshold"] = AQI_THRESHOLD
    result["triggered"] = result["aqi"] >= AQI_THRESHOLD
    return result

async def check_and_fire_aqi_trigger(pin_code: str, city_name: str, lat: float, lon: float, store) -> bool:
    aqi_data = await get_aqi_for_zone(pin_code, city_name, lat, lon)
    
    if not aqi_data["triggered"]:
        logger.info(f"AQI check {pin_code}: {aqi_data['aqi']} — below threshold")
        return False
        
    logger.info(f"AQI TRIGGER: {city_name} AQI={aqi_data['aqi']} source={aqi_data['source']}")
    
    active_riders = store.get_active_riders_in_zone(pin_code)
    if not active_riders:
        return False
        
    event = store.fire_trigger(
        trigger_type="aqi",
        zone=pin_code,
        metric=aqi_data["aqi"],
        threshold=f">= {AQI_THRESHOLD} AQI",
        affected_rider_ids=[r.rider_id for r in active_riders]
    )
    
    for rider in active_riders:
        store.create_claim_for_rider(
            rider_id=rider.rider_id,
            trigger_event=event,
            amount_paise=35000
        )
        
    return True
