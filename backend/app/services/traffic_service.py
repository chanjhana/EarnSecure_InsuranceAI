from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging
from typing import Any, Optional

import httpx

from ..config import CFG

logger = logging.getLogger("earnsecure.traffic")

# Minimal operating-zone bounding boxes for polling.
# Format: minLon,minLat,maxLon,maxLat (TomTom incidentDetails API format).
PINCODE_BOUNDING_BOXES: dict[str, str] = {
    "560034": "77.6000,12.8900,77.6700,12.9700",  # Bengaluru (Koramangala/HSR)
    "600042": "80.2000,12.9200,80.2700,12.9900",  # Chennai (Velachery)
    "641659": "76.9000,10.9500,77.0200,11.0600",  # Coimbatore outskirts
}


@dataclass
class ZoneTrafficSnapshot:
    pin_code: str
    bbox: str
    jam_factor: float
    severe_incidents: int
    roadblocks: int
    incidents_total: int
    observed_at: datetime
    source: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "pin_code": self.pin_code,
            "bbox": self.bbox,
            "jam_factor": self.jam_factor,
            "severe_incidents": self.severe_incidents,
            "roadblocks": self.roadblocks,
            "incidents_total": self.incidents_total,
            "observed_at": self.observed_at.isoformat(),
            "source": self.source,
        }


class TrafficService:
    """TomTom-based traffic and roadblock intelligence service."""

    _tomtom_incidents_url = "https://api.tomtom.com/traffic/services/5/incidentDetails"

    def _bbox_for_pin(self, pincode: str) -> str:
        if pincode in PINCODE_BOUNDING_BOXES:
            return PINCODE_BOUNDING_BOXES[pincode]
        # Default fallback box (small tile around Bengaluru center)
        return "77.5600,12.9400,77.6400,13.0200"

    @staticmethod
    def _extract_incidents(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, dict):
            incidents = payload.get("incidents")
            if isinstance(incidents, list):
                return [item for item in incidents if isinstance(item, dict)]
            for value in payload.values():
                nested = TrafficService._extract_incidents(value)
                if nested:
                    return nested
        elif isinstance(payload, list):
            for item in payload:
                nested = TrafficService._extract_incidents(item)
                if nested:
                    return nested
        return []

    @staticmethod
    def _is_roadblock(incident: dict[str, Any]) -> bool:
        incident_type = str(incident.get("type", "")).lower()
        if "roadclosed" in incident_type or "closed" in incident_type or "blocked" in incident_type:
            return True

        events = incident.get("events")
        if isinstance(events, list):
            for event in events:
                if not isinstance(event, dict):
                    continue
                text = f"{event.get('description', '')} {event.get('code', '')}".lower()
                if any(keyword in text for keyword in ["roadblock", "road block", "closed", "closure", "blocked", "diversion"]):
                    return True
        return False

    @staticmethod
    def _is_severe(incident: dict[str, Any]) -> bool:
        delay = incident.get("magnitudeOfDelay")
        try:
            delay_score = int(delay)
        except (TypeError, ValueError):
            delay_score = 0
        return delay_score >= 3

    async def get_zone_snapshot(self, pincode: str) -> ZoneTrafficSnapshot:
        bbox = self._bbox_for_pin(pincode)
        observed_at = datetime.utcnow()

        if not CFG.TOMTOM_API_KEY:
            # Stable fallback signal for local testing without external dependency.
            if pincode.endswith(("8", "9")):
                return ZoneTrafficSnapshot(
                    pin_code=pincode,
                    bbox=bbox,
                    jam_factor=1.72,
                    severe_incidents=2,
                    roadblocks=1,
                    incidents_total=5,
                    observed_at=observed_at,
                    source="tomtom_placeholder",
                )
            return ZoneTrafficSnapshot(
                pin_code=pincode,
                bbox=bbox,
                jam_factor=1.18,
                severe_incidents=0,
                roadblocks=0,
                incidents_total=1,
                observed_at=observed_at,
                source="tomtom_placeholder",
            )

        params = {
            "bbox": bbox,
            "fields": "{incidents{type,magnitudeOfDelay,events{description,code}}}",
            "language": "en-GB",
            "timeValidityFilter": "present",
            "key": CFG.TOMTOM_API_KEY,
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(self._tomtom_incidents_url, params=params)
            response.raise_for_status()
            payload = response.json()

        incidents = self._extract_incidents(payload)
        roadblocks = sum(1 for incident in incidents if self._is_roadblock(incident))
        severe_incidents = sum(1 for incident in incidents if self._is_severe(incident))

        # Heuristic jam-factor compression into [1.0, 2.5]
        jam_factor = 1.0 + min(1.5, roadblocks * 0.35 + severe_incidents * 0.22 + len(incidents) * 0.03)

        return ZoneTrafficSnapshot(
            pin_code=pincode,
            bbox=bbox,
            jam_factor=round(jam_factor, 2),
            severe_incidents=severe_incidents,
            roadblocks=roadblocks,
            incidents_total=len(incidents),
            observed_at=observed_at,
            source="tomtom_api",
        )

    async def get_traffic_jam_factor(self, pincode: str) -> Optional[float]:
        snapshot = await self.get_zone_snapshot(pincode)
        return snapshot.jam_factor

    async def poll_bounding_boxes(self, pin_codes: list[str]) -> list[ZoneTrafficSnapshot]:
        if not pin_codes:
            return []

        snapshots: list[ZoneTrafficSnapshot] = []
        for pin_code in sorted(set(pin_codes)):
            try:
                snapshots.append(await self.get_zone_snapshot(pin_code))
            except Exception as exc:
                logger.error(f"Traffic poll failed for {pin_code}: {exc}")
        return snapshots


traffic_service = TrafficService()
