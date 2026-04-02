"""Lightweight in-memory store and helpers for the demo backend."""
from __future__ import annotations

import random
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import uuid4


@dataclass
class RiderRecord:
    rider_id: str
    phone: str
    vehicle_number: Optional[str] = None
    legal_name: Optional[str] = None
    password_hash: Optional[str] = None
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    platform: Optional[str] = None
    pin_code: Optional[str] = None
    zones: List[str] = field(default_factory=list)
    shift_windows: List[str] = field(default_factory=list)
    upi_id: Optional[str] = None
    activity_summary: Dict[str, object] = field(default_factory=dict)


@dataclass
class PolicyRecord:
    policy_id: str
    rider_id: str
    status: str
    week_start: datetime
    week_end: datetime
    next_premium: int


@dataclass
class ClaimRecord:
    id: str
    rider_id: str
    trigger_type: str
    amount_paise: int
    status: str
    created_at: datetime
    fraud_score: float
    fraud_checks: Dict[str, bool]
    trigger_event: Dict[str, object]


@dataclass
class TriggerEventRecord:
    event_id: str
    trigger_type: str
    zone: str
    metric: float
    threshold: str
    observed_at: datetime
    status: str
    affected_riders: int


class InMemoryStore:
    """Deliberately simple storage to make the API demo-friendly."""

    def __init__(self) -> None:
        self.otps: Dict[str, dict] = {}
        self.riders: Dict[str, RiderRecord] = {}
        self.policies: Dict[str, PolicyRecord] = {}
        self.claims: Dict[str, ClaimRecord] = {}
        self.rider_policy_index: Dict[str, str] = {}
        self.fraud_queue: List[str] = []
        self.trigger_events: List[TriggerEventRecord] = []
        self.weekly_premiums_paise = 150_000
        self.weekly_payouts_paise = 92_500
        self._seed_sample_data()

    def _seed_sample_data(self) -> None:
        rider = RiderRecord(
            rider_id="rider-001",
            phone="+91 90000 11111",
            platform="swiggy",
            pin_code="560034",
            zones=["Koramangala", "HSR"],
            shift_windows=["evening"],
            upi_id="ravi@upi",
            activity_summary={"d30_orders": 228, "avg_daily": 7.6, "zones": ["Koramangala", "HSR"]},
        )
        self.riders[rider.rider_id] = rider

        week_start, week_end = self._current_week_bounds()
        policy = PolicyRecord(
            policy_id="policy-001",
            rider_id=rider.rider_id,
            status="active",
            week_start=week_start,
            week_end=week_end,
            next_premium=8800,
        )
        self.policies[policy.policy_id] = policy
        self.rider_policy_index[rider.rider_id] = policy.policy_id

        claim = ClaimRecord(
            id="claim-001",
            rider_id=rider.rider_id,
            trigger_type="rain",
            amount_paise=60000,
            status="paid",
            created_at=datetime.utcnow() - timedelta(days=3),
            fraud_score=0.18,
            fraud_checks={"online": True, "order_drop": True, "gps_zone_match": True},
            trigger_event={"rain_mm": 78.2, "threshold": 64.5, "zone": "560034"},
        )
        self.claims[claim.id] = claim

        claim2 = ClaimRecord(
            id="claim-002",
            rider_id=rider.rider_id,
            trigger_type="outage",
            amount_paise=50000,
            status="held",
            created_at=datetime.utcnow() - timedelta(hours=10),
            fraud_score=0.64,
            fraud_checks={"online": True, "order_drop": True, "gps_zone_match": False},
            trigger_event={"outage_minutes": 47, "zone": "560034"},
        )
        self.claims[claim2.id] = claim2
        self.fraud_queue.append(claim2.id)

        self.trigger_events.extend(
            [
                TriggerEventRecord(
                    event_id="event-001",
                    trigger_type="rain",
                    zone="560034",
                    metric=78.2,
                    threshold=">= 64.5 mm",
                    observed_at=datetime.utcnow() - timedelta(days=3, minutes=12),
                    status="paid",
                    affected_riders=38,
                ),
                TriggerEventRecord(
                    event_id="event-002",
                    trigger_type="outage",
                    zone="560034",
                    metric=47.0,
                    threshold=">= 30 min",
                    observed_at=datetime.utcnow() - timedelta(hours=10, minutes=18),
                    status="held",
                    affected_riders=21,
                ),
            ]
        )

    @staticmethod
    def _current_week_bounds() -> tuple[datetime, datetime]:
        today = datetime.utcnow()
        week_start = (today - timedelta(days=today.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        return week_start, week_end

    def issue_otp(self, phone: str) -> str:
        otp = "".join(random.choices(string.digits, k=6))
        self.otps[phone] = {"otp": otp, "expires_at": datetime.utcnow() + timedelta(minutes=10)}
        print(f"NEW - OTP : {otp}")  # For development purposes
        # TODO: Integrate OTP SMS API to send OTP via SMS instead of printing
        return otp

    def verify_otp(self, phone: str, otp: str) -> str:
        record = self.otps.get(phone)
        if not record or record["otp"] != otp or record["expires_at"] < datetime.utcnow():
            raise ValueError("Invalid or expired OTP")
        rider_id = self._get_or_create_rider(phone)
        return rider_id

    def _get_or_create_rider(self, phone: str) -> str:
        for rider in self.riders.values():
            if rider.phone == phone:
                return rider.rider_id
        new_id = f"rider-{len(self.riders) + 1:03d}"
        self.riders[new_id] = RiderRecord(rider_id=new_id, phone=phone)
        return new_id

    def ensure_rider(self, rider_id: str, phone: Optional[str] = None) -> RiderRecord:
        rider = self.riders.get(rider_id)
        if rider:
            if phone and not rider.phone:
                rider.phone = phone
            return rider

        restored_phone = phone or "+91 00000 00000"
        rider = RiderRecord(rider_id=rider_id, phone=restored_phone)
        self.riders[rider_id] = rider
        return rider

    def link_platform(self, rider_id: str, platform: str) -> PlatformActivitySummary:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")
        rider.platform = platform
        summary = {
            "d30_orders": random.randint(120, 260),
            "avg_daily": round(random.uniform(5.0, 9.5), 1),
            "zones": ["Koramangala", "HSR", "BTM"] if platform == "swiggy" else ["Indiranagar", "MG Road"],
        }
        rider.activity_summary = summary
        return summary  # type: ignore[return-value]

    def update_profile(self, rider_id: str, pin_code: str, zones: List[str], shift_windows: List[str], upi_id: Optional[str]) -> None:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")
        rider.pin_code = pin_code
        rider.zones = zones
        rider.shift_windows = shift_windows
        rider.upi_id = upi_id or rider.upi_id

    def calculate_premium(self, rider_id: str) -> dict:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")

        # Dummy premium calculation logic
        gbr_score = round(random.uniform(0.1, 0.9), 2)
        cohort_adj = round(random.uniform(-0.15, 0.15), 2)
        base_premium = 10000
        premium = int(base_premium * (1 + gbr_score + cohort_adj))

        return {
            "premium_paise": premium,
            "gbr_score": gbr_score,
            "cohort_adj": cohort_adj,
            "model_inputs": {
                "pin_code": rider.pin_code or "N/A",
                "zones": ", ".join(rider.zones),
                "shift_windows": ", ".join(rider.shift_windows),
                "d30_orders": rider.activity_summary.get("d30_orders", 0),
                "avg_daily_hrs": rider.activity_summary.get("avg_daily", 0),
            },
            "covers": [
                {"type": "rain", "min_paise": 5000, "max_paise": 20000},
                {"type": "heat", "min_paise": 3000, "max_paise": 15000},
                {"type": "outage", "min_paise": 4000, "max_paise": 18000},
            ],
        }

    def activate_policy(self, rider_id: str, upi_id: str) -> PolicyRecord:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")
        rider.upi_id = upi_id
        week_start, week_end = self._current_week_bounds()
        policy = PolicyRecord(
            policy_id=str(uuid4()),
            rider_id=rider_id,
            status="active",
            week_start=week_start,
            week_end=week_end,
            next_premium=random.randint(4500, 11000),
        )
        self.policies[policy.policy_id] = policy
        self.rider_policy_index[rider_id] = policy.policy_id
        return policy

    def current_policy(self, rider_id: str) -> PolicyRecord:
        policy_id = self.rider_policy_index.get(rider_id)
        if policy_id and policy_id in self.policies:
            return self.policies[policy_id]
        return self.activate_policy(rider_id, upi_id="upi@demo")

    def list_claims(self, rider_id: str) -> List[ClaimRecord]:
        return [c for c in self.claims.values() if c.rider_id == rider_id]

    def claim_detail(self, claim_id: str) -> ClaimRecord:
        claim = self.claims.get(claim_id)
        if not claim:
            raise KeyError("claim not found")
        return claim

    def portfolio_stats(self) -> dict:
        active_policies = sum(1 for p in self.policies.values() if p.status == "active")
        loss_ratio = 0.0
        if self.weekly_premiums_paise:
            loss_ratio = round(self.weekly_payouts_paise / self.weekly_premiums_paise, 2)
        return {
            "active_policies": active_policies,
            "loss_ratio": loss_ratio,
            "weekly_payouts_paise": self.weekly_payouts_paise,
            "fraud_queue_size": len(self.fraud_queue),
        }

    def fraud_queue_items(self) -> List[ClaimRecord]:
        return [self.claims[cid] for cid in self.fraud_queue if cid in self.claims]

    def approve_claim(self, claim_id: str, note: Optional[str]) -> None:
        claim = self.claims.get(claim_id)
        if not claim:
            raise KeyError("claim not found")
        claim.status = "approved"
        self.weekly_payouts_paise += claim.amount_paise
        claim.fraud_checks["manual_review_note"] = note or "approved"
        if claim_id in self.fraud_queue:
            self.fraud_queue.remove(claim_id)

    def reject_claim(self, claim_id: str, reason: Optional[str]) -> None:
        claim = self.claims.get(claim_id)
        if not claim:
            raise KeyError("claim not found")
        claim.status = "rejected"
        claim.fraud_checks["manual_review_note"] = reason or "rejected"
        if claim_id in self.fraud_queue:
            self.fraud_queue.remove(claim_id)

    def list_trigger_events(self) -> List[TriggerEventRecord]:
        events = sorted(self.trigger_events, key=lambda event: event.observed_at, reverse=True)
        return events[:50]

    def fire_demo_trigger(self, pin_code: str, trigger_type: str) -> TriggerEventRecord:
        thresholds = {
            "rain": (71.0, ">= 64.5 mm"),
            "heat": (46.8, ">= 45 C"),
            "outage": (42.0, ">= 30 min"),
            "aqi": (326.0, ">= 300"),
            "closure": (11.0, "zone closure count >= 8"),
            "fog": (38.0, "visibility < 50 m"),
        }
        metric, threshold = thresholds.get(trigger_type, (0.0, "threshold reached"))

        affected_rider_ids = [
            rider_id
            for rider_id, rider in self.riders.items()
            if rider.pin_code == pin_code and rider_id in self.rider_policy_index
        ]

        event = TriggerEventRecord(
            event_id=f"event-{uuid4().hex[:8]}",
            trigger_type=trigger_type,
            zone=pin_code,
            metric=metric,
            threshold=threshold,
            observed_at=datetime.utcnow(),
            status="processing",
            affected_riders=len(affected_rider_ids),
        )
        self.trigger_events.append(event)

        for rider_id in affected_rider_ids:
            amount_map = {
                "rain": random.randint(30_000, 60_000),
                "heat": random.randint(40_000, 70_000),
                "outage": random.randint(30_000, 50_000),
                "aqi": random.randint(30_000, 40_000),
                "closure": random.randint(30_000, 40_000),
                "fog": 30_000,
            }
            amount = amount_map.get(trigger_type, 30_000)
            fraud_score = round(random.uniform(0.1, 0.82), 2)

            claim = ClaimRecord(
                id=f"claim-{uuid4().hex[:10]}",
                rider_id=rider_id,
                trigger_type=trigger_type,
                amount_paise=amount,
                status="held" if fraud_score >= 0.6 else "paid",
                created_at=datetime.utcnow(),
                fraud_score=fraud_score,
                fraud_checks={
                    "online": True,
                    "order_drop": True,
                    "gps_zone_match": True,
                },
                trigger_event={
                    "event_id": event.event_id,
                    "metric": metric,
                    "threshold": threshold,
                    "zone": pin_code,
                },
            )
            self.claims[claim.id] = claim

            if claim.status == "held":
                self.fraud_queue.append(claim.id)
            else:
                self.weekly_payouts_paise += claim.amount_paise

        held_count = len([cid for cid in self.fraud_queue if self.claims[cid].trigger_event.get("event_id") == event.event_id])
        event.status = "held" if held_count else "paid"
        return event

    @staticmethod
    def iso(dt: datetime) -> str:
        return dt.isoformat()

    def week_progress(self, policy: PolicyRecord) -> float:
        total = (policy.week_end - policy.week_start).total_seconds()
        spent = (datetime.utcnow() - policy.week_start).total_seconds()
        return max(0.0, min(1.0, spent / total)) if total else 0.0


# Type alias used for type hints without importing Pydantic inside storage
class PlatformActivitySummary(dict):
    pass
