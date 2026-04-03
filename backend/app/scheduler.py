import asyncio
import logging
import os
from typing import Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Import the actual store type, assume it's InMemoryStore for typing
from app.storage import InMemoryStore
from app.services.aqi_service import check_and_fire_aqi_trigger
from app.services.outage_service import check_and_fire_outage_trigger
from app.services.weather_service import weather_service

# Thresholds as specified
RAIN_THRESHOLD_MM = 64.5
HEAT_INDEX_THRESHOLD_C = 42.0
AQI_THRESHOLD = 300
FOG_VISIBILITY_THRESHOLD_M = 200

logger = logging.getLogger("earnsecure.scheduler")

# Module level singleton
_scheduler = AsyncIOScheduler()

def _get_api_key() -> Optional[str]:
    return os.getenv("OPENWEATHERMAP_API_KEY")

async def check_rain_trigger(pin_code: str, store: InMemoryStore):
    api_key = _get_api_key()
    if not api_key:
        return

    url = f"https://api.openweathermap.org/data/2.5/weather?zip={pin_code},IN&appid={api_key}&units=metric"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    # Determine 1h rain
    rain_data = data.get("rain", {})
    rain_1h = rain_data.get("1h", 0.0)

    if rain_1h >= RAIN_THRESHOLD_MM:
        logger.info(f"Rain trigger fired for {pin_code}. Rain {rain_1h}mm >= {RAIN_THRESHOLD_MM}mm")
        
        # Determine affected riders
        affected_rider_ids = [
            rider_id for rider_id, rider in store.riders.items()
            if rider.pin_code == pin_code and store.policies.get(store.rider_policy_index.get(rider_id, "")).status == "active"
        ]
        
        if not affected_rider_ids:
            return

        event = store.fire_trigger(
            trigger_type="rain",
            zone=pin_code,
            metric=rain_1h,
            threshold=f">= {RAIN_THRESHOLD_MM} mm",
            affected_rider_ids=affected_rider_ids
        )
        
        for rider_id in affected_rider_ids:
            store.create_claim_for_rider(rider_id, trigger_event=event, amount_paise=500_00)


async def check_heat_trigger(pin_code: str, store: InMemoryStore):
    api_key = _get_api_key()
    if not api_key:
        return

    url = f"https://api.openweathermap.org/data/2.5/weather?zip={pin_code},IN&appid={api_key}&units=metric"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    feels_like = data.get("main", {}).get("feels_like", 0.0)

    if feels_like >= HEAT_INDEX_THRESHOLD_C:
        logger.info(f"Heat trigger fired for {pin_code}. Heat Index {feels_like}C >= {HEAT_INDEX_THRESHOLD_C}C")
        
        affected_rider_ids = [
            rider_id for rider_id, rider in store.riders.items()
            if rider.pin_code == pin_code and store.policies.get(store.rider_policy_index.get(rider_id, "")).status == "active"
        ]
        
        if not affected_rider_ids:
            return

        event = store.fire_trigger(
            trigger_type="heat",
            zone=pin_code,
            metric=feels_like,
            threshold=f">= {HEAT_INDEX_THRESHOLD_C} C",
            affected_rider_ids=affected_rider_ids
        )
        
        for rider_id in affected_rider_ids:
            store.create_claim_for_rider(rider_id, trigger_event=event, amount_paise=400_00)


async def check_aqi_trigger(pin_code: str, city_name: str, lat: float, lon: float, store: InMemoryStore):
    return await check_and_fire_aqi_trigger(
        pin_code, city_name, lat, lon, store
    )

async def check_fog_trigger(pin_code: str, lat: float, lon: float, store: InMemoryStore):
    api_key = _get_api_key()
    if not api_key:
        return

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    visibility = data.get("visibility", 10000)

    if visibility <= FOG_VISIBILITY_THRESHOLD_M:
        logger.info(f"Fog trigger fired for {pin_code}. Visibility {visibility}m <= {FOG_VISIBILITY_THRESHOLD_M}m")
        
        affected_rider_ids = [
            rider_id for rider_id, rider in store.riders.items()
            if rider.pin_code == pin_code and store.policies.get(store.rider_policy_index.get(rider_id, "")).status == "active"
        ]
        
        if not affected_rider_ids:
            return

        event = store.fire_trigger(
            trigger_type="fog",
            zone=pin_code,
            metric=visibility,
            threshold=f"<= {FOG_VISIBILITY_THRESHOLD_M} m",
            affected_rider_ids=affected_rider_ids
        )
        
        for rider_id in affected_rider_ids:
            store.create_claim_for_rider(rider_id, trigger_event=event, amount_paise=300_00)


async def check_platform_outage_trigger(store: InMemoryStore):
    await check_and_fire_outage_trigger(store)


async def run_all_trigger_checks(store: InMemoryStore):
    if not _get_api_key():
        logger.warning("OPENWEATHERMAP_API_KEY is missing. Skipping all weather checks.")
        return

    logger.info("Starting run_all_trigger_checks")
    
    # Run global checks first
    await check_platform_outage_trigger(store)

    pin_codes = store.get_unique_active_pin_codes()
    logger.info(f"Checking triggers for active pin codes: {pin_codes}")

    tasks = []
    for pc in pin_codes:
        # Pre-fetch geocodes dynamically resolving bounding boxes to avoid dual fetches
        try:
            forecast = await weather_service.get_risk_forecast(pc)
            lat = forecast.get("lat", 0.0)
            lon = forecast.get("lon", 0.0)
            city_name = forecast.get("city_name", "Unknown")
            
            tasks.extend([
                check_rain_trigger(pc, store),
                check_heat_trigger(pc, store),
                check_aqi_trigger(pc, city_name, lat, lon, store),
                check_fog_trigger(pc, lat, lon, store)
            ])
        except Exception as e:
            logger.error(f"Failed pulling baseline block for pin {pc}: {e}")
            
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, Exception):
                logger.error(f"Error during trigger check: {res}")


def start_scheduler(store: InMemoryStore):
    if not _scheduler.running:
        # Schedule the job every 15 minutes, passing the store as an argument
        _scheduler.add_job(
            run_all_trigger_checks,
            'interval',
            minutes=15,
            args=[store],
            id="trigger_checks_job",
            replace_existing=True
        )
        _scheduler.start()
        logger.info("Scheduler started successfully")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown()
        logger.info("Scheduler stopped")
