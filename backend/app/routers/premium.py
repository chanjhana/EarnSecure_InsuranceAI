from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import PremiumRequest, PremiumResponse
from ..storage import InMemoryStore

router = APIRouter(prefix="/premium", tags=["premium"])


@router.post("/calculate", response_model=PremiumResponse)
async def calculate(
    payload: PremiumRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> PremiumResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    if payload.rider_id not in store.riders:
        raise HTTPException(status_code=404, detail="rider not found")
    result = store.calculate_premium(payload.rider_id)
    return PremiumResponse(**result)
