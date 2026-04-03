"""Pydantic schemas mirroring the frontend API clients."""
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+91 98765 43210"})


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class VerifyOtpResponse(BaseModel):
    access_token: str
    rider_id: str


class RiderInfoRequest(BaseModel):
    rider_id: str
    vehicle_number: str
    legal_name: str
    password: str


class RiderLoginRequest(BaseModel):
    phone: str
    password: str


class AdminLoginRequest(BaseModel):
    password: str


class AuthSessionResponse(BaseModel):
    rider_id: str
    phone: str
    token_type: Literal["access"]


class LinkPlatformRequest(BaseModel):
    platform: Literal["swiggy", "zomato"]
    rider_id: str


class PlatformActivitySummary(BaseModel):
    d30_orders: int
    avg_daily: float
    zones: List[str]


class LinkPlatformResponse(BaseModel):
    valid: bool
    activity_summary: PlatformActivitySummary


class UpdateRiderProfileRequest(BaseModel):
    rider_id: str
    pin_code: str
    zones: List[str]
    shift_windows: List[Literal["morning", "afternoon", "evening", "night"]]
    upi_id: Optional[str] = None


class TriggerCoverage(BaseModel):
    type: Literal["rain", "heat", "outage", "aqi", "closure", "fog"]
    min_paise: int
    max_paise: int


class PremiumRequest(BaseModel):
    rider_id: str
    pin_code: str
    shift_windows: List[str]
    zones: List[str]


class PremiumResponse(BaseModel):
    weekly_premium_paise: int
    weekly_premium_inr: float
    risk_score: float
    breakdown: Dict
    city_name: str
    forecast_source: str
    model: str


class Policy(BaseModel):
    policy_id: str
    rider_id: str
    status: Literal["active", "hold", "expired"]
    week_start: str
    week_end: str


class TriggerStatus(BaseModel):
    trigger_type: str
    threshold_label: str
    is_armed: bool
    last_checked_at: Optional[str] = None
    state: Optional[Literal["idle", "watch", "fired"]] = None


class ActivatePolicyRequest(BaseModel):
    rider_id: str
    upi_id: str


class CurrentPolicyResponse(BaseModel):
    policy: Policy
    week_progress: float
    next_premium: int
    trigger_statuses: List[TriggerStatus]


class Claim(BaseModel):
    id: str
    rider_id: str
    trigger_type: str
    amount_paise: int
    status: Literal["approved", "held", "rejected", "paid"]
    created_at: str


class ClaimDetailResponse(BaseModel):
    claim: Claim
    fraud_score: float
    fraud_checks: Dict[str, bool | str]
    trigger_event: Dict[str, str | int | float]


class PortfolioStats(BaseModel):
    active_policies: int
    loss_ratio: float
    weekly_payouts_paise: int
    fraud_queue_size: int


class FraudQueueItem(BaseModel):
    id: str
    rider_id: str
    fraud_score: float
    flag_reason: str
    trigger_type: str


class ClaimDecisionRequest(BaseModel):
    reviewer_note: Optional[str] = None
    reason: Optional[str] = None


class TriggerEvent(BaseModel):
    event_id: str
    trigger_type: Literal["rain", "heat", "outage", "aqi", "closure", "fog"]
    zone: str
    metric: float
    threshold: str
    observed_at: str
    status: Literal["pending", "processing", "approved", "held", "paid", "rejected"]
    affected_riders: int


class DemoFireTriggerRequest(BaseModel):
    pin_code: str
    trigger_type: Literal["rain", "heat", "outage", "aqi", "closure", "fog"]


class DemoFireTriggerResponse(BaseModel):
    fired: bool
    event_id: str


class RiderVerificationInfo(BaseModel):
    rider_id: str
    legal_name: str
    vehicle_number: str
    is_verified: bool
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
