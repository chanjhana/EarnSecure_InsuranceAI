import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Import the actual store type, assume it's InMemoryStore for typing
from app.config import CFG
from app.storage import InMemoryStore
from app.services.aqi_service import check_and_fire_aqi_trigger
from app.services.outage_service import check_and_fire_outage_trigger
from app.services.traffic_service import traffic_service
from app.services.weather_service import weather_service

# Thresholds as specified
RAIN_THRESHOLD_MM = CFG.RAIN_THRESHOLD_MM
HEAT_INDEX_THRESHOLD_C = CFG.HEAT_INDEX_THRESHOLD_C
AQI_THRESHOLD = CFG.AQI_THRESHOLD
FOG_VISIBILITY_THRESHOLD_M = 200

logger = logging.getLogger("earnsecure.scheduler")

# Module level singleton
_scheduler = AsyncIOScheduler()
_traffic_zone_treatment_until: dict[str, datetime] = {}

def _get_api_key() -> Optional[str]:
    return os.getenv("OPENWEATHERMAP_API_KEY")


def _active_rider_ids_for_pin(store: InMemoryStore, pin_code: str) -> list[str]:
    rider_ids: list[str] = []
    for rider_id, rider in store.riders.items():
        if rider.pin_code != pin_code:
            continue
        policy_id = store.rider_policy_index.get(rider_id)
        if not policy_id:
            continue
        policy = store.policies.get(policy_id)
        if policy and policy.status == "active":
            rider_ids.append(rider_id)
    return rider_ids


def _traffic_three_point_validation(rider, pin_code: str) -> tuple[bool, bool, bool]:
    activity = rider.activity_summary or {}

    # Check-1: rider was online in recent period.
    is_online_recent = bool(activity.get("is_online_recent", True)) and int(activity.get("d30_orders", 0)) >= 5

    # Check-2: motion dropped by >=60% over the 25-minute window.
    motion_drop_25m = float(activity.get("motion_drop_25m", 0.65))
    has_motion_drop = motion_drop_25m >= CFG.TRAFFIC_MOTION_DROP_THRESHOLD

    # Check-3: rider is physically in the affected zone.
    in_zone = rider.pin_code == pin_code
    return is_online_recent, has_motion_drop, in_zone

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

        affected_rider_ids = _active_rider_ids_for_pin(store, pin_code)
        
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

        affected_rider_ids = _active_rider_ids_for_pin(store, pin_code)
        
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

        affected_rider_ids = _active_rider_ids_for_pin(store, pin_code)
        
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


async def check_traffic_roadblock_trigger(store: InMemoryStore) -> None:
    pin_codes = store.get_unique_active_pin_codes()
    if not pin_codes:
        return

    snapshots = await traffic_service.poll_bounding_boxes(pin_codes)
    now = datetime.utcnow()

    for snapshot in snapshots:
        severe_signal = (
            snapshot.jam_factor >= CFG.TRAFFIC_JAM_FACTOR_THRESHOLD
            or snapshot.roadblocks >= CFG.TRAFFIC_ROADBLOCK_THRESHOLD
        )
        if not severe_signal:
            continue

        treatment_until = _traffic_zone_treatment_until.get(snapshot.pin_code)
        if treatment_until and treatment_until > now:
            logger.info(
                "Traffic treatment active for zone %s until %s; skipping duplicate trigger",
                snapshot.pin_code,
                treatment_until.isoformat(),
            )
            continue

        validated_rider_ids: list[str] = []
        for rider in store.get_active_riders_in_zone(snapshot.pin_code):
            online_check, motion_drop_check, geo_check = _traffic_three_point_validation(rider, snapshot.pin_code)
            if online_check and motion_drop_check and geo_check:
                validated_rider_ids.append(rider.rider_id)

        if not validated_rider_ids:
            continue

        trigger_type = "roadblock" if snapshot.roadblocks >= CFG.TRAFFIC_ROADBLOCK_THRESHOLD else "traffic"
        threshold_label = (
            f"bbox polling/15min; jam>={CFG.TRAFFIC_JAM_FACTOR_THRESHOLD} or roadblocks>={CFG.TRAFFIC_ROADBLOCK_THRESHOLD}; "
            f"3-point validation + {CFG.TRAFFIC_TREATMENT_WINDOW_HOURS}h treatment"
        )
        event = store.fire_trigger(
            trigger_type=trigger_type,
            zone=snapshot.pin_code,
            metric=snapshot.jam_factor,
            threshold=threshold_label,
            affected_rider_ids=validated_rider_ids,
        )

        payout = CFG.PAYOUTS[trigger_type]["full"]
        for rider_id in validated_rider_ids:
            store.create_claim_for_rider(rider_id=rider_id, trigger_event=event, amount_paise=payout)

        _traffic_zone_treatment_until[snapshot.pin_code] = now + timedelta(hours=CFG.TRAFFIC_TREATMENT_WINDOW_HOURS)
        logger.info(
            "Traffic trigger fired for %s: jam_factor=%.2f roadblocks=%s riders=%s",
            snapshot.pin_code,
            snapshot.jam_factor,
            snapshot.roadblocks,
            len(validated_rider_ids),
        )


async def run_all_trigger_checks(store: InMemoryStore):
    logger.info("Starting run_all_trigger_checks")

    # Run global checks first
    await check_platform_outage_trigger(store)
    await check_traffic_roadblock_trigger(store)

    if not _get_api_key():
        logger.warning("OPENWEATHERMAP_API_KEY is missing. Skipping weather checks.")
        return

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
