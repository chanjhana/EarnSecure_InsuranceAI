"""Pydantic schemas mirroring the frontend API clients."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

AccountStatusCode = Literal[
    "O1_OTP_SENT_NOT_VERIFIED",
    "O2_OTP_VERIFIED_PROFILE_PENDING",
    "O3_PROFILE_COMPLETED",
    "O4_PLATFORM_LINKED",
    "O5_POLICY_ACTIVE_PAYMENT_PENDING",
    "O6_PAYMENT_SUBMITTED_ADMIN_REVIEW",
    "O7_PAYMENT_CONFIRMED_WEEK_ACTIVE",
    "O8_PAYMENT_REJECTED_ACTION_REQUIRED",
    "O9_ACCOUNT_SUSPENDED",
]

TriggerType = Literal["rain", "heat", "outage", "aqi", "closure", "fog", "traffic", "roadblock"]

PaymentProvider = Literal["upi_qr", "razorpay"]
PaymentStatus = Literal["initiated", "pending_admin_confirmation", "confirmed", "rejected", "failed"]


class SendOtpRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+91 98765 43210"})


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class VerifyOtpResponse(BaseModel):
    access_token: str
    rider_id: str
    legal_name: Optional[str] = None


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
    type: TriggerType
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
    breakdown: Dict[str, Any]
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
    trigger_type: TriggerType
    zone: str
    metric: float
    threshold: str
    observed_at: str
    status: Literal["pending", "processing", "approved", "held", "paid", "rejected"]
    affected_riders: int


class DemoFireTriggerRequest(BaseModel):
    pin_code: str
    trigger_type: TriggerType


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
    account_status: Optional[AccountStatusCode] = None


class RiderSearchResult(BaseModel):
    rider_id: str
    name: str
    phone: str
    platform: Literal["swiggy", "zomato", "zepto", "blinkit", "unknown"]
    home_zone: str
    orders_d30: int
    claims_d30: int
    paid_claims_d30: int
    paid_amount_paise_d30: int
    risk_score: float
    approval_rate: float
    last_seen_at: str
    account_status: Optional[AccountStatusCode] = None


class PaymentRecordResponse(BaseModel):
    payment_id: str
    rider_id: str
    provider: PaymentProvider
    status: PaymentStatus
    amount_paise: int
    created_at: str
    updated_at: str
    upi_uri: Optional[str] = None
    qr_image_url: Optional[str] = None
    upi_transaction_id: Optional[str] = None
    payer_upi_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    checkout_key: Optional[str] = None
    checkout_url: Optional[str] = None
    account_status: Optional[AccountStatusCode] = None
    admin_note: Optional[str] = None


class CreateUpiQrPaymentRequest(BaseModel):
    rider_id: str
    upi_id: str
    amount_paise: int = Field(..., ge=100)
    note: Optional[str] = None


class SubmitUpiQrTransactionRequest(BaseModel):
    payment_id: str
    rider_id: str
    upi_transaction_id: str
    payer_upi_id: str


class CreateRazorpayOrderRequest(BaseModel):
    rider_id: str
    amount_paise: int = Field(..., ge=100)
    upi_id: Optional[str] = None


class ConfirmPaymentRequest(BaseModel):
    approve: bool
    admin_note: Optional[str] = None
    account_status: Optional[AccountStatusCode] = None


class AccountStatusUpdateRequest(BaseModel):
    account_status: AccountStatusCode
    note: Optional[str] = None


class AccountStatusOption(BaseModel):
    code: AccountStatusCode
    label: str
    description: str


class AccountStatusHistoryItem(BaseModel):
    rider_id: str
    from_status: Optional[AccountStatusCode] = None
    to_status: AccountStatusCode
    changed_by: str
    source: str
    note: Optional[str] = None
    payment_id: Optional[str] = None
    changed_at: str


class OutboundIvrCallRequest(BaseModel):
    phone: str
    rider_id: Optional[str] = None
