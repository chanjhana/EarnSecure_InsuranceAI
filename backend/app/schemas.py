"""Pydantic schemas mirroring the frontend API clients."""
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    phone: str = Field(..., example="+91 98765 43210")


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class VerifyOtpResponse(BaseModel):
    access_token: str
    rider_id: str


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
    shift_window: Literal["morning", "afternoon", "evening", "night"]
    upi_id: Optional[str] = None


class TriggerCoverage(BaseModel):
    type: Literal["rain", "heat", "outage", "aqi", "closure", "fog"]
    min_paise: int
    max_paise: int


class PremiumRequest(BaseModel):
    rider_id: str


class PremiumResponse(BaseModel):
    premium_paise: int
    gbr_score: float
    cohort_adj: float
    model_inputs: Dict[str, float | str]
    covers: List[TriggerCoverage]


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
    fraud_checks: Dict[str, bool]
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
