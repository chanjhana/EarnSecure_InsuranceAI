"""Lightweight in-memory store and helpers for the demo backend."""
from __future__ import annotations

import random
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import uuid4

# Import the actual business logic services
from .services.premium_logic import calculate_premium
from .services.fraud_logic import evaluate_fraud_risk
from .services.notification_service import send_claim_sms
from .services.payment_service import payment_service
from .config import CFG


ACCOUNT_STATUS_OPTIONS = {
    "O1_OTP_SENT_NOT_VERIFIED": {
        "label": "OTP Sent, Not Verified",
        "description": "Rider OTP was issued but phone verification is still pending.",
    },
    "O2_OTP_VERIFIED_PROFILE_PENDING": {
        "label": "OTP Verified, Profile Pending",
        "description": "Phone is verified, but profile details are incomplete.",
    },
    "O3_PROFILE_COMPLETED": {
        "label": "Profile Completed",
        "description": "Rider profile and credentials are completed.",
    },
    "O4_PLATFORM_LINKED": {
        "label": "Platform Linked",
        "description": "Platform account and work zones are linked.",
    },
    "O5_POLICY_ACTIVE_PAYMENT_PENDING": {
        "label": "Policy Active, Payment Pending",
        "description": "Policy is active while payment confirmation is pending.",
    },
    "O6_PAYMENT_SUBMITTED_ADMIN_REVIEW": {
        "label": "Payment Submitted, Admin Review",
        "description": "User submitted UPI transaction details for admin verification.",
    },
    "O7_PAYMENT_CONFIRMED_WEEK_ACTIVE": {
        "label": "Payment Confirmed, Week Active",
        "description": "Payment is admin-confirmed and account is active for the week.",
    },
    "O8_PAYMENT_REJECTED_ACTION_REQUIRED": {
        "label": "Payment Rejected, Action Required",
        "description": "Submitted payment details were rejected and rider action is required.",
    },
    "O9_ACCOUNT_SUSPENDED": {
        "label": "Account Suspended",
        "description": "Account access suspended by admin risk controls.",
    },
}


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
    account_status: str = "O1_OTP_SENT_NOT_VERIFIED"
    account_flags: Dict[str, bool] = field(default_factory=dict)
    account_note: Optional[str] = None
    phone_verified_at: Optional[datetime] = None
    payment_submitted_at: Optional[datetime] = None
    payment_confirmed_at: Optional[datetime] = None


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


@dataclass
class PaymentRecord:
    payment_id: str
    rider_id: str
    provider: str
    amount_paise: int
    status: str
    created_at: datetime
    updated_at: datetime
    upi_uri: Optional[str] = None
    qr_image_url: Optional[str] = None
    upi_transaction_id: Optional[str] = None
    payer_upi_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    checkout_key: Optional[str] = None
    checkout_url: Optional[str] = None
    admin_note: Optional[str] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None


class InMemoryStore:
    """Deliberately simple storage to make the API demo-friendly."""

    def __init__(self) -> None:
        self.otps: Dict[str, dict] = {}
        self.riders: Dict[str, RiderRecord] = {}
        self.policies: Dict[str, PolicyRecord] = {}
        self.claims: Dict[str, ClaimRecord] = {}
        self.payments: Dict[str, PaymentRecord] = {}
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
            is_verified=True,
            platform="swiggy",
            pin_code="560034",
            zones=["Koramangala", "HSR"],
            shift_windows=["evening"],
            upi_id="ravi@upi",
            activity_summary={"d30_orders": 228, "avg_daily": 7.6, "zones": ["Koramangala", "HSR"]},
            account_status="O7_PAYMENT_CONFIRMED_WEEK_ACTIVE",
            account_flags={
                "otp_sent": True,
                "otp_verified": True,
                "profile_completed": True,
                "platform_linked": True,
                "payment_confirmed": True,
            },
            phone_verified_at=datetime.utcnow() - timedelta(days=30),
            payment_confirmed_at=datetime.utcnow() - timedelta(days=2),
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
        # For hackathon/demo purposes, hardcode the OTP to 123456 so it's easy to test
        otp = "123456"
        self.otps[phone] = {"otp": otp, "expires_at": datetime.utcnow() + timedelta(minutes=10)}
        rider = self.ensure_rider(self._get_or_create_rider(phone), phone)
        rider.account_flags["otp_sent"] = True
        rider.account_status = "O1_OTP_SENT_NOT_VERIFIED"
        print(f"NEW - OTP : {otp}")  # For development purposes
        # TODO: Integrate OTP SMS API to send OTP via SMS instead of printing
        return otp

    def verify_otp(self, phone: str, otp: str) -> str:
        record = self.otps.get(phone)
        if not record or record["otp"] != otp or record["expires_at"] < datetime.utcnow():
            raise ValueError("Invalid or expired OTP")
        rider_id = self._get_or_create_rider(phone)
        rider = self.riders[rider_id]
        rider.account_flags["otp_verified"] = True
        rider.account_status = "O2_OTP_VERIFIED_PROFILE_PENDING"
        rider.phone_verified_at = datetime.utcnow()
        return rider_id

    def _get_or_create_rider(self, phone: str) -> str:
        for rider in self.riders.values():
            if rider.phone == phone:
                return rider.rider_id
        new_id = f"rider-{len(self.riders) + 1:03d}"
        self.riders[new_id] = RiderRecord(
            rider_id=new_id,
            phone=phone,
            account_status="O1_OTP_SENT_NOT_VERIFIED",
            account_flags={"otp_sent": True},
        )
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
        rider.account_flags["platform_linked"] = True
        rider.account_status = "O4_PLATFORM_LINKED"
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
        rider.account_flags["profile_completed"] = True
        if rider.upi_id:
            rider.account_flags["upi_linked"] = True
        if rider.account_status in {"O1_OTP_SENT_NOT_VERIFIED", "O2_OTP_VERIFIED_PROFILE_PENDING", "O3_PROFILE_COMPLETED"}:
            rider.account_status = "O4_PLATFORM_LINKED"

    def calculate_premium(self, rider_id: str) -> dict:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")

        # Convert simple rider struct into dictionary for the premium model
        rider_profile = {
            "rider_id": rider.rider_id,
            "pin_code": rider.pin_code,
            "platform": rider.platform,
            "zones": rider.zones,
            "shift_windows": rider.shift_windows,
            "activity_summary": rider.activity_summary,
        }

        # Calculate using the integrated logic
        premium_paise = calculate_premium(rider_profile)
        
        # Calculate reverse approximations just to satisfy the schema response
        gbr_score = (premium_paise / float(CFG.PREMIUM_BASE_PAISE)) - 1.0
        cohort_adj = 0.0  # Simplification for response interface

        return {
            "premium_paise": premium_paise,
            "gbr_score": round(gbr_score, 2),
            "cohort_adj": round(cohort_adj, 2),
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
        rider.account_flags["upi_linked"] = True
        rider.account_flags["policy_active"] = True
        rider.account_status = "O5_POLICY_ACTIVE_PAYMENT_PENDING"
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

    def list_account_status_options(self) -> list[dict[str, str]]:
        options: list[dict[str, str]] = []
        for code, meta in ACCOUNT_STATUS_OPTIONS.items():
            options.append(
                {
                    "code": code,
                    "label": meta["label"],
                    "description": meta["description"],
                }
            )
        return options

    def set_rider_account_status(self, rider_id: str, account_status: str, note: Optional[str] = None) -> RiderRecord:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")
        if account_status not in ACCOUNT_STATUS_OPTIONS:
            raise ValueError("invalid account status")
        rider.account_status = account_status
        rider.account_note = note
        return rider

    def create_upi_qr_payment(self, rider_id: str, upi_id: str, amount_paise: int, note: Optional[str] = None) -> PaymentRecord:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")

        rider.upi_id = upi_id
        rider.account_flags["upi_linked"] = True

        now = datetime.utcnow()
        payment_id = f"pay-{uuid4().hex[:12]}"
        upi_uri = payment_service.build_upi_uri(transaction_ref=payment_id, amount_paise=amount_paise, note=note)
        qr_image_url = payment_service.build_qr_image_url(upi_uri)

        payment = PaymentRecord(
            payment_id=payment_id,
            rider_id=rider_id,
            provider="upi_qr",
            amount_paise=amount_paise,
            status="initiated",
            created_at=now,
            updated_at=now,
            upi_uri=upi_uri,
            qr_image_url=qr_image_url,
        )
        self.payments[payment.payment_id] = payment
        rider.account_status = "O5_POLICY_ACTIVE_PAYMENT_PENDING"
        return payment

    def submit_upi_qr_transaction(self, payment_id: str, rider_id: str, upi_transaction_id: str, payer_upi_id: str) -> PaymentRecord:
        payment = self.payments.get(payment_id)
        if not payment or payment.rider_id != rider_id:
            raise KeyError("payment not found")

        payment.upi_transaction_id = upi_transaction_id
        payment.payer_upi_id = payer_upi_id
        payment.status = "pending_admin_confirmation"
        payment.updated_at = datetime.utcnow()

        rider = self.riders.get(rider_id)
        if rider:
            rider.payment_submitted_at = payment.updated_at
            rider.account_flags["payment_submitted"] = True
            rider.account_status = "O6_PAYMENT_SUBMITTED_ADMIN_REVIEW"

        return payment

    async def create_razorpay_payment(self, rider_id: str, amount_paise: int, upi_id: Optional[str] = None) -> PaymentRecord:
        rider = self.riders.get(rider_id)
        if not rider:
            raise KeyError("rider not found")

        if upi_id:
            rider.upi_id = upi_id
            rider.account_flags["upi_linked"] = True

        order = await payment_service.create_razorpay_order(rider_id=rider_id, amount_paise=amount_paise)
        now = datetime.utcnow()
        payment = PaymentRecord(
            payment_id=f"pay-{uuid4().hex[:12]}",
            rider_id=rider_id,
            provider="razorpay",
            amount_paise=amount_paise,
            status="initiated",
            created_at=now,
            updated_at=now,
            razorpay_order_id=order.get("id"),
            checkout_key=CFG.RAZORPAY_KEY_ID,
            checkout_url=CFG.RAZORPAY_CHECKOUT_BASE_URL,
        )
        self.payments[payment.payment_id] = payment
        rider.account_status = "O5_POLICY_ACTIVE_PAYMENT_PENDING"
        return payment

    def confirm_payment(
        self,
        payment_id: str,
        admin_id: str,
        approve: bool,
        admin_note: Optional[str] = None,
        account_status: Optional[str] = None,
    ) -> PaymentRecord:
        payment = self.payments.get(payment_id)
        if not payment:
            raise KeyError("payment not found")

        payment.updated_at = datetime.utcnow()
        payment.admin_note = admin_note
        payment.confirmed_by = admin_id

        rider = self.riders.get(payment.rider_id)
        if approve:
            payment.status = "confirmed"
            payment.confirmed_at = payment.updated_at
            if rider:
                rider.payment_confirmed_at = payment.updated_at
                rider.account_flags["payment_confirmed"] = True
                rider.account_flags["week_active"] = True
                rider.account_status = account_status or "O7_PAYMENT_CONFIRMED_WEEK_ACTIVE"
        else:
            payment.status = "rejected"
            if rider:
                rider.account_flags["payment_confirmed"] = False
                rider.account_flags["week_active"] = False
                rider.account_status = account_status or "O8_PAYMENT_REJECTED_ACTION_REQUIRED"

        return payment

    def list_pending_payments(self) -> list[PaymentRecord]:
        rows = [payment for payment in self.payments.values() if payment.status == "pending_admin_confirmation"]
        rows.sort(key=lambda payment: payment.updated_at, reverse=True)
        return rows

    def get_payment(self, payment_id: str) -> PaymentRecord:
        payment = self.payments.get(payment_id)
        if not payment:
            raise KeyError("payment not found")
        return payment

    def list_rider_payments(self, rider_id: str) -> list[PaymentRecord]:
        rows = [payment for payment in self.payments.values() if payment.rider_id == rider_id]
        rows.sort(key=lambda payment: payment.updated_at, reverse=True)
        return rows

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
            "traffic": (1.9, ">= 1.5 jam factor"),
            "roadblock": (2.0, ">= 1 severe roadblock"),
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
                "rain": CFG.PAYOUTS["rain"]["full"],
                "heat": CFG.PAYOUTS["heat"]["full"],
                "outage": CFG.PAYOUTS["outage"]["full"],
                "aqi": CFG.PAYOUTS["aqi"]["full"],
                "closure": CFG.PAYOUTS["closure"]["full"],
                "fog": CFG.PAYOUTS["fog"]["full"],
                "traffic": CFG.PAYOUTS["traffic"]["full"],
                "roadblock": CFG.PAYOUTS["roadblock"]["full"],
            }
            amount = amount_map.get(trigger_type, 30_000)
            
            # Use actual fraud detection service instead of random values
            rider_profile = {
                "rider_id": rider_id,
                "pin_code": self.riders[rider_id].pin_code,
                "shift_windows": self.riders[rider_id].shift_windows,
                "activity_summary": self.riders[rider_id].activity_summary
            }
            event_data = {"zone": pin_code}
            
            fraud_score, fraud_checks = evaluate_fraud_risk(
                claim_type=trigger_type,
                rider_profile=rider_profile,
                event_data=event_data
            )

            claim = ClaimRecord(
                id=f"claim-{uuid4().hex[:10]}",
                rider_id=rider_id,
                trigger_type=trigger_type,
                amount_paise=amount,
                status="held" if fraud_score >= CFG.FRAUD_WATCH else "paid",
                created_at=datetime.utcnow(),
                fraud_score=round(fraud_score, 2),
                fraud_checks=fraud_checks,
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

    def get_unique_active_pin_codes(self) -> list[str]:
        pin_codes = set()
        for rider_id, policy_id in self.rider_policy_index.items():
            policy = self.policies.get(policy_id)
            if policy and policy.status == "active":
                rider = self.riders.get(rider_id)
                if rider and rider.pin_code:
                    pin_codes.add(rider.pin_code)
        return list(pin_codes)

    def get_active_riders_in_zone(self, pin_code: str) -> list[RiderRecord]:
        active_riders = []
        for rider_id, policy_id in self.rider_policy_index.items():
            policy = self.policies.get(policy_id)
            if policy and policy.status == "active":
                rider = self.riders.get(rider_id)
                if rider and rider.pin_code == pin_code:
                    active_riders.append(rider)
        return active_riders

    def fire_trigger(self, trigger_type: str, zone: str, metric: float, threshold: str, affected_rider_ids: list[str]) -> TriggerEventRecord:
        event = TriggerEventRecord(
            event_id=f"event-{uuid4().hex[:8]}",
            trigger_type=trigger_type,
            zone=zone,
            metric=metric,
            threshold=threshold,
            observed_at=datetime.utcnow(),
            status="processing",
            affected_riders=len(affected_rider_ids),
        )
        self.trigger_events.append(event)
        
        # update event status to paid/held properly based on claims (to be done later if needed, handled by claims generation)
        return event

    def create_claim_for_rider(self, rider_id: str, trigger_event: TriggerEventRecord, amount_paise: int) -> ClaimRecord:
        rider_profile = {
            "rider_id": rider_id,
            "pin_code": self.riders[rider_id].pin_code,
            "shift_windows": self.riders[rider_id].shift_windows,
            "activity_summary": self.riders[rider_id].activity_summary
        }
        event_data = {"zone": trigger_event.zone}
        
        fraud_score, fraud_checks = evaluate_fraud_risk(
            claim_type=trigger_event.trigger_type,
            rider_profile=rider_profile,
            event_data=event_data
        )

        claim = ClaimRecord(
            id=f"claim-{uuid4().hex[:10]}",
            rider_id=rider_id,
            trigger_type=trigger_event.trigger_type,
            amount_paise=amount_paise,
            status="held" if fraud_score >= CFG.FRAUD_WATCH else "paid",
            created_at=datetime.utcnow(),
            fraud_score=round(fraud_score, 2),
            fraud_checks=fraud_checks,
            trigger_event={
                "event_id": trigger_event.event_id,
                "metric": trigger_event.metric,
                "threshold": trigger_event.threshold,
                "zone": trigger_event.zone,
            },
        )
        self.claims[claim.id] = claim

        if claim.status == "held":
            self.fraud_queue.append(claim.id)
            trigger_event.status = "held"
        else:
            self.weekly_payouts_paise += claim.amount_paise
            if trigger_event.status != "held":
                trigger_event.status = "paid"
            
            # Parametric transaction complete -> trigger SMS
            rider_phone = self.riders[rider_id].phone
            if rider_phone:
                send_claim_sms(rider_phone, amount_paise, trigger_event.trigger_type)

        return claim


# Type alias used for type hints without importing Pydantic inside storage
class PlatformActivitySummary(dict):
    pass

