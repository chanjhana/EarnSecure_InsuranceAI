import asyncio
import logging
from datetime import datetime, timezone
import httpx
import feedparser

logger = logging.getLogger("earnsecure.outage")

PLATFORM_FEEDS = {
    "swiggy": "https://downdetector.in/status/swiggy/rss/",
    "zomato": "https://downdetector.in/status/zomato/rss/"
}
REPORT_SPIKE_THRESHOLD = 5
SPIKE_WINDOW_MINUTES = 30
OUTAGE_COOLDOWN_MINUTES = 120

_last_trigger_time = {}

async def fetch_downdetector_reports(platform: str) -> dict:
    url = PLATFORM_FEEDS.get(platform)
    if not url:
        return {
            "platform": platform,
            "recent_reports": 0,
            "threshold": REPORT_SPIKE_THRESHOLD,
            "is_down": False,
            "checked_at": datetime.utcnow().isoformat(),
            "source": "downdetector_failed"
        }

    try:
        async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "EarnSecure/1.0 (insurance platform monitor)"}) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        now = datetime.utcnow()
        recent_count = 0
        
        for entry in feed.entries:
            published = entry.get("published_parsed")
            if published:
                pub_dt = datetime(*published[:6])
                if (now - pub_dt).total_seconds() < SPIKE_WINDOW_MINUTES * 60:
                    recent_count += 1

        return {
            "platform": platform,
            "recent_reports": recent_count,
            "threshold": REPORT_SPIKE_THRESHOLD,
            "is_down": recent_count >= REPORT_SPIKE_THRESHOLD,
            "checked_at": now.isoformat(),
            "source": "downdetector_rss"
        }
    except Exception as e:
        logger.error(f"Downdetector check failed for {platform}: {e}")
        return {
            "platform": platform,
            "recent_reports": 0,
            "threshold": REPORT_SPIKE_THRESHOLD,
            "is_down": False,
            "checked_at": datetime.utcnow().isoformat(),
            "source": "downdetector_failed"
        }

def is_in_cooldown(platform: str) -> bool:
    if platform not in _last_trigger_time:
        return False
    elapsed = (datetime.utcnow() - _last_trigger_time[platform]).total_seconds()
    return elapsed < OUTAGE_COOLDOWN_MINUTES * 60

async def check_and_fire_outage_trigger(store) -> bool:
    results = await asyncio.gather(
        fetch_downdetector_reports("swiggy"),
        fetch_downdetector_reports("zomato"),
        return_exceptions=True
    )
    
    did_fire = False
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Exception during check_and_fire_outage_trigger: {result}")
            continue
            
        if not result["is_down"]:
            continue
            
        platform = result["platform"]
        
        if is_in_cooldown(platform):
            logger.info(f"{platform} outage detected but in cooldown — skipping")
            continue
            
        logger.info(f"OUTAGE TRIGGER: {platform} — {result['recent_reports']} reports in last {SPIKE_WINDOW_MINUTES} min")
        
        _last_trigger_time[platform] = datetime.utcnow()
        
        affected = [
            r for r in store.riders.values()
            if r.platform == platform and r.rider_id in store.rider_policy_index
        ]
        
        if not affected:
            logger.info(f"No active riders for {platform}")
            continue
            
        event = store.fire_trigger(
            trigger_type="outage",
            zone="all",
            metric=float(result["recent_reports"]),
            threshold=f">= {REPORT_SPIKE_THRESHOLD} reports/30min",
            affected_rider_ids=[r.rider_id for r in affected]
        )
        
        for rider in affected:
            store.create_claim_for_rider(
                rider_id=rider.rider_id,
                trigger_event=event,
                amount_paise=45000
            )
            
        did_fire = True
        
    return did_fire
