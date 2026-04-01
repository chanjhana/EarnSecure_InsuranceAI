from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_store
from ..schemas import ClaimDecisionRequest, FraudQueueItem, PortfolioStats
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


@router.get("/portfolio", response_model=PortfolioStats)
async def portfolio(store: InMemoryStore = Depends(get_store)) -> PortfolioStats:
    return PortfolioStats(**store.portfolio_stats())


@router.get("/fraud-queue", response_model=list[FraudQueueItem])
async def fraud_queue(store: InMemoryStore = Depends(get_store)) -> list[FraudQueueItem]:
    return [_serialize_queue_item(item) for item in store.fraud_queue_items()]


@router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: str, payload: ClaimDecisionRequest, store: InMemoryStore = Depends(get_store)) -> dict:
    try:
        store.approve_claim(claim_id, payload.reviewer_note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="claim not found") from exc
    return {"approved": True}


@router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: str, payload: ClaimDecisionRequest, store: InMemoryStore = Depends(get_store)) -> dict:
    try:
        store.reject_claim(claim_id, payload.reason)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="claim not found") from exc
    return {"rejected": True}
