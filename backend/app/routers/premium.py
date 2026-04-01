from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_store
from ..schemas import PremiumRequest, PremiumResponse
from ..storage import InMemoryStore

router = APIRouter(prefix="/premium", tags=["premium"])


@router.post("/calculate", response_model=PremiumResponse)
async def calculate(payload: PremiumRequest, store: InMemoryStore = Depends(get_store)) -> PremiumResponse:
    if payload.rider_id not in store.riders:
        raise HTTPException(status_code=404, detail="rider not found")
    result = store.calculate_premium(payload.rider_id)
    return PremiumResponse(**result)
