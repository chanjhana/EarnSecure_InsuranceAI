import asyncio
import logging
import os
from typing import Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Import the actual store type, assume it's InMemoryStore for typing
from app.storage import InMemoryStore

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


async def check_aqi_trigger(pin_code: str, store: InMemoryStore):
    api_key = _get_api_key()
    if not api_key:
        return

    # Step 1: Geocode
    geo_url = f"http://api.openweathermap.org/geo/1.0/zip?zip={pin_code},IN&appid={api_key}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        geo_resp = await client.get(geo_url)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
        lat = geo_data["lat"]
        lon = geo_data["lon"]

    # Step 2: AQI
    aqi_url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={api_key}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        aqi_resp = await client.get(aqi_url)
        aqi_resp.raise_for_status()
        aqi_data = aqi_resp.json()
    
    # OWM AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    owm_aqi = aqi_data.get("list", [{}])[0].get("main", {}).get("aqi", 1)
    
    # Map to Indian AQI roughly
    aqi_map = {1: 50, 2: 100, 3: 200, 4: 250, 5: 350}
    mapped_aqi = aqi_map.get(owm_aqi, 50)

    if mapped_aqi >= AQI_THRESHOLD:
        logger.info(f"AQI trigger fired for {pin_code}. AQI {mapped_aqi} >= {AQI_THRESHOLD}")
        
        affected_rider_ids = [
            rider_id for rider_id, rider in store.riders.items()
            if rider.pin_code == pin_code and store.policies.get(store.rider_policy_index.get(rider_id, "")).status == "active"
        ]
        
        if not affected_rider_ids:
            return

        event = store.fire_trigger(
            trigger_type="aqi",
            zone=pin_code,
            metric=mapped_aqi,
            threshold=f">= {AQI_THRESHOLD}",
            affected_rider_ids=affected_rider_ids
        )
        
        for rider_id in affected_rider_ids:
            store.create_claim_for_rider(rider_id, trigger_event=event, amount_paise=350_00)


async def check_fog_trigger(pin_code: str, store: InMemoryStore):
    api_key = _get_api_key()
    if not api_key:
        return

    url = f"https://api.openweathermap.org/data/2.5/weather?zip={pin_code},IN&appid={api_key}&units=metric"
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
    logger.info("Outage check not yet wired")
    return


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
        tasks.extend([
            check_rain_trigger(pc, store),
            check_heat_trigger(pc, store),
            check_aqi_trigger(pc, store),
            check_fog_trigger(pc, store)
        ])
    
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
