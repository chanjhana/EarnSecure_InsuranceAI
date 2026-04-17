from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_admin_id, get_store
from ..schemas import (
    AccountStatusHistoryItem,
    AccountStatusOption,
    AccountStatusUpdateRequest,
    AdminLoginRequest,
    ClaimDecisionRequest,
    ConfirmPaymentRequest,
    DemoFireTriggerRequest,
    DemoFireTriggerResponse,
    FraudQueueItem,
    PaymentRecordResponse,
    PortfolioStats,
    RiderSearchResult,
    RiderVerificationInfo,
    TriggerEvent,
)
from ..security import create_access_token, verify_admin_password
from ..storage import InMemoryStore
from datetime import datetime, timedelta
import asyncio
from ..services.outage_service import fetch_downdetector_reports

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("")
async def admin_root() -> dict:
    return {
        "service": "earnsecure_admin_api",
        "login": "/admin/login",
        "docs": "/docs",
    }


def _serialize_queue_item(record) -> FraudQueueItem:
    return FraudQueueItem(
        id=record.id,
        rider_id=record.rider_id,
        fraud_score=record.fraud_score,
        flag_reason="GPS mismatch" if not record.fraud_checks.get("gps_zone_match", True) else "manual review",
        trigger_type=record.trigger_type,
    )


def _serialize_trigger_event(event) -> TriggerEvent:
    return TriggerEvent(
        event_id=event.event_id,
        trigger_type=event.trigger_type,
        zone=event.zone,
        metric=event.metric,
        threshold=event.threshold,
        observed_at=event.observed_at.isoformat(),
        status=event.status,
        affected_riders=event.affected_riders,
    )


def _serialize_payment(record, account_status: str | None = None) -> PaymentRecordResponse:
    return PaymentRecordResponse(
        payment_id=record.payment_id,
        rider_id=record.rider_id,
        provider=record.provider,
        status=record.status,
        amount_paise=record.amount_paise,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
        upi_uri=record.upi_uri,
        qr_image_url=record.qr_image_url,
        upi_transaction_id=record.upi_transaction_id,
        payer_upi_id=record.payer_upi_id,
        razorpay_order_id=record.razorpay_order_id,
        razorpay_payment_id=record.razorpay_payment_id,
        checkout_key=record.checkout_key,
        checkout_url=record.checkout_url,
        account_status=account_status,
        admin_note=record.admin_note,
    )


def _matches_query(value: str, query: str) -> bool:
    return query in value.lower()


def _serialize_rider_search(rider, store: InMemoryStore) -> RiderSearchResult:
    now = datetime.utcnow()
    since = now - timedelta(days=30)
    claims = [c for c in store.claims.values() if c.rider_id == rider.rider_id and c.created_at >= since]

    claims_d30 = len(claims)
    paid_claims_d30 = len([c for c in claims if c.status in {"paid", "approved"}])
    paid_amount_paise_d30 = sum(c.amount_paise for c in claims if c.status in {"paid", "approved"})
    orders_d30 = int(rider.activity_summary.get("d30_orders", 0)) if rider.activity_summary else 0

    claim_ratio = claims_d30 / max(orders_d30, 1)
    paid_ratio = paid_claims_d30 / max(claims_d30, 1)

    risk_score = min(0.99, round(0.18 + claim_ratio * 1.5, 3))
    approval_rate = round(paid_ratio, 3)

    home_zone = rider.zones[0] if rider.zones else (rider.pin_code or "N/A")

    return RiderSearchResult(
        rider_id=rider.rider_id,
        name=rider.legal_name or f"Rider {rider.rider_id}",
        phone=rider.phone,
        platform=(rider.platform or "unknown"),
        home_zone=home_zone,
        orders_d30=orders_d30,
        claims_d30=claims_d30,
        paid_claims_d30=paid_claims_d30,
        paid_amount_paise_d30=paid_amount_paise_d30,
        risk_score=risk_score,
        approval_rate=approval_rate,
        last_seen_at=now.isoformat(),
        account_status=rider.account_status,
    )


@router.post("/login")
async def admin_login(payload: AdminLoginRequest) -> dict:
    if not verify_admin_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": create_access_token("admin", "admin", role="admin"), "token_type": "bearer"}


@router.get("/portfolio", response_model=PortfolioStats)
async def portfolio(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> PortfolioStats:
    return PortfolioStats(**store.portfolio_stats())


@router.get("/fraud-queue", response_model=list[FraudQueueItem])
async def fraud_queue(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[FraudQueueItem]:
    return [_serialize_queue_item(item) for item in store.fraud_queue_items()]


@router.get("/trigger-events", response_model=list[TriggerEvent])
async def trigger_events(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[TriggerEvent]:
    return [_serialize_trigger_event(event) for event in store.list_trigger_events()]


@router.get("/riders/verification", response_model=list[RiderVerificationInfo])
async def list_riders_for_verification(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[RiderVerificationInfo]:
    riders = []
    for rider in store.riders.values():
        riders.append(
            RiderVerificationInfo(
                rider_id=rider.rider_id,
                legal_name=rider.legal_name or "N/A",
                vehicle_number=rider.vehicle_number or "N/A",
                is_verified=rider.is_verified,
                verified_by=rider.verified_by,
                verified_at=rider.verified_at.isoformat() if rider.verified_at else None,
                account_status=rider.account_status,
            )
        )
    return riders


@router.get("/riders", response_model=list[RiderSearchResult])
async def search_riders(
    query: str,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[RiderSearchResult]:
    normalized = query.strip().lower()
    if not normalized:
        return []

    results: list[RiderSearchResult] = []
    for rider in store.riders.values():
        candidates = [
            rider.rider_id,
            rider.phone,
            rider.legal_name or "",
            rider.vehicle_number or "",
            rider.platform or "",
        ]
        if any(_matches_query(value, normalized) for value in candidates if value):
            results.append(_serialize_rider_search(rider, store))

    results.sort(key=lambda item: item.risk_score, reverse=True)
    return results


@router.post("/riders/{rider_id}/verify")
async def verify_rider(
    rider_id: str,
    store: InMemoryStore = Depends(get_store),
    admin_id: str = Depends(get_current_admin_id),
) -> dict:
    try:
        store.mark_rider_verified(rider_id, admin_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Rider not found") from exc
    return {"verified": True}


@router.get("/account-status-options", response_model=list[AccountStatusOption])
async def account_status_options(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[AccountStatusOption]:
    return [AccountStatusOption(**option) for option in store.list_account_status_options()]


@router.get("/payments/pending", response_model=list[PaymentRecordResponse])
async def pending_payments(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[PaymentRecordResponse]:
    rows = []
    for record in store.list_pending_payments():
        rider = store.riders.get(record.rider_id)
        rows.append(_serialize_payment(record, rider.account_status if rider else None))
    return rows


@router.post("/payments/{payment_id}/confirm", response_model=PaymentRecordResponse)
async def confirm_payment(
    payment_id: str,
    payload: ConfirmPaymentRequest,
    store: InMemoryStore = Depends(get_store),
    admin_id: str = Depends(get_current_admin_id),
) -> PaymentRecordResponse:
    try:
        payment = store.confirm_payment(
            payment_id=payment_id,
            admin_id=admin_id,
            approve=payload.approve,
            admin_note=payload.admin_note,
            account_status=payload.account_status,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="payment not found") from exc

    rider = store.riders.get(payment.rider_id)
    return _serialize_payment(payment, rider.account_status if rider else None)


@router.post("/riders/{rider_id}/account-status")
async def set_rider_account_status(
    rider_id: str,
    payload: AccountStatusUpdateRequest,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> dict:
    try:
        rider = store.set_rider_account_status(rider_id, payload.account_status, payload.note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Rider not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "updated": True,
        "rider_id": rider.rider_id,
        "account_status": rider.account_status,
    }


@router.get("/riders/{rider_id}/status-history", response_model=list[AccountStatusHistoryItem])
async def rider_status_history(
    rider_id: str,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> list[AccountStatusHistoryItem]:
    if rider_id not in store.riders:
        raise HTTPException(status_code=404, detail="Rider not found")

    items = []
    for record in store.list_rider_status_history(rider_id):
        items.append(
            AccountStatusHistoryItem(
                rider_id=record.rider_id,
                from_status=record.from_status,
                to_status=record.to_status,
                changed_by=record.changed_by,
                source=record.source,
                note=record.note,
                payment_id=record.payment_id,
                changed_at=record.changed_at.isoformat(),
            )
        )
    return items


@router.post("/claims/{claim_id}/approve")
async def approve_claim(
    claim_id: str,
    payload: ClaimDecisionRequest,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> dict:
    try:
        store.approve_claim(claim_id, payload.reviewer_note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="claim not found") from exc
    return {"approved": True}


@router.post("/claims/{claim_id}/reject")
async def reject_claim(
    claim_id: str,
    payload: ClaimDecisionRequest,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> dict:
    try:
        store.reject_claim(claim_id, payload.reason)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="claim not found") from exc
    return {"rejected": True}


@router.post("/demo/fire-trigger", response_model=DemoFireTriggerResponse)
async def fire_demo_trigger(
    payload: DemoFireTriggerRequest,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_admin_id),
) -> DemoFireTriggerResponse:
    event = store.fire_demo_trigger(payload.pin_code, payload.trigger_type)
    return DemoFireTriggerResponse(fired=True, event_id=event.event_id)


@router.get("/outage-status")
async def get_outage_status(_: str = Depends(get_current_admin_id)):
    results = await asyncio.gather(
        fetch_downdetector_reports("swiggy"),
        fetch_downdetector_reports("zomato"),
        return_exceptions=True,
    )

    response = {"checked_at": datetime.utcnow().isoformat()}
    for result in results:
        if isinstance(result, Exception):
            continue
        platform = result.get("platform")
        if platform:
            response[platform] = result

    return response
