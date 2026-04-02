from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import LinkPlatformRequest, LinkPlatformResponse, UpdateRiderProfileRequest
from ..storage import InMemoryStore

router = APIRouter(prefix="/riders", tags=["riders"])


@router.post("/link-platform", response_model=LinkPlatformResponse)
async def link_platform(
    payload: LinkPlatformRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> LinkPlatformResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    try:
        summary = store.link_platform(payload.rider_id, payload.platform)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc
    return LinkPlatformResponse(valid=True, activity_summary=summary)


@router.put("/{rider_id}/profile")
async def update_profile(
    rider_id: str,
    payload: UpdateRiderProfileRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> dict:
    if rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    if rider_id != payload.rider_id:
        raise HTTPException(status_code=400, detail="rider id mismatch")
    try:
        store.update_profile(rider_id, payload.pin_code, payload.shift_window, payload.upi_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc
    return {"updated": True}
