from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import (
    ClaimDecisionRequest,
    DemoFireTriggerRequest,
    DemoFireTriggerResponse,
    FraudQueueItem,
    PortfolioStats,
    TriggerEvent,
)
from ..storage import InMemoryStore

router = APIRouter(prefix="/admin", tags=["admin"])


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


@router.get("/portfolio", response_model=PortfolioStats)
async def portfolio(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_rider_id),
) -> PortfolioStats:
    return PortfolioStats(**store.portfolio_stats())


@router.get("/fraud-queue", response_model=list[FraudQueueItem])
async def fraud_queue(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_rider_id),
) -> list[FraudQueueItem]:
    return [_serialize_queue_item(item) for item in store.fraud_queue_items()]


@router.get("/trigger-events", response_model=list[TriggerEvent])
async def trigger_events(
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_rider_id),
) -> list[TriggerEvent]:
    return [_serialize_trigger_event(event) for event in store.list_trigger_events()]


@router.post("/claims/{claim_id}/approve")
async def approve_claim(
    claim_id: str,
    payload: ClaimDecisionRequest,
    store: InMemoryStore = Depends(get_store),
    _: str = Depends(get_current_rider_id),
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
    _: str = Depends(get_current_rider_id),
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
    _: str = Depends(get_current_rider_id),
) -> DemoFireTriggerResponse:
    event = store.fire_demo_trigger(payload.pin_code, payload.trigger_type)
    return DemoFireTriggerResponse(fired=True, event_id=event.event_id)
