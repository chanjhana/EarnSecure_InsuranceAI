from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import PremiumRequest, PremiumResponse
from ..services.premium_logic import calculate_premium

router = APIRouter(prefix="/premium", tags=["premium"])


@router.post("/calculate", response_model=PremiumResponse)
async def calculate(
    payload: PremiumRequest,
    current_rider_id: str = Depends(get_current_rider_id),
) -> PremiumResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    
    result = await calculate_premium({
        "rider_id": payload.rider_id,
        "pin_code": payload.pin_code,
        "shift_windows": payload.shift_windows,
        "zones": payload.zones,
    })
    
    return PremiumResponse(**result)
