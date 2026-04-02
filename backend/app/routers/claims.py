from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import Claim, ClaimDetailResponse
from ..storage import InMemoryStore

router = APIRouter(prefix="/claims", tags=["claims"])


def _serialize_claim(record) -> Claim:
    return Claim(
        id=record.id,
        rider_id=record.rider_id,
        trigger_type=record.trigger_type,
        amount_paise=record.amount_paise,
        status=record.status,
        created_at=record.created_at.isoformat(),
    )


@router.get("/{rider_id}", response_model=list[Claim])
async def list_claims(
    rider_id: str,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> list[Claim]:
    if rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    if rider_id not in store.riders:
        raise HTTPException(status_code=404, detail="rider not found")
    claims = store.list_claims(rider_id)
    claims.sort(key=lambda c: c.created_at, reverse=True)
    return [_serialize_claim(c) for c in claims]


@router.get("/{claim_id}/detail", response_model=ClaimDetailResponse)
async def claim_detail(
    claim_id: str,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> ClaimDetailResponse:
    try:
        claim = store.claim_detail(claim_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="claim not found") from exc
    if claim.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    return ClaimDetailResponse(
        claim=_serialize_claim(claim),
        fraud_score=claim.fraud_score,
        fraud_checks=claim.fraud_checks,
        trigger_event=claim.trigger_event,
    )
