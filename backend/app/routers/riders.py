from fastapi import APIRouter, Depends, HTTPException
import requests

from ..dependencies import get_current_rider_id, get_store, get_token_payload
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
    token_payload: dict = Depends(get_token_payload),
) -> dict:
    if rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    if rider_id != payload.rider_id:
        raise HTTPException(status_code=400, detail="rider id mismatch")

    # In demo mode, in-memory data can reset on reload while token remains valid.
    store.ensure_rider(rider_id, token_payload.get("phone"))

    try:
        store.update_profile(rider_id, payload.pin_code, payload.zones, payload.shift_windows, payload.upi_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc
    return {"updated": True}


@router.get("/zones")
async def get_zones(pincode: str) -> dict:
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid pincode")

    try:
        response = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=10,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "Accept": "application/json",
            },
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch zones: {exc}") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Postal API returned non-200 status")

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Postal API returned invalid JSON") from exc

    if not isinstance(data, list) or not data:
        raise HTTPException(status_code=502, detail="Postal API returned unexpected payload")

    payload = data[0] or {}
    if payload.get("Status") != "Success":
        message = payload.get("Message") or "No zones found for this pincode"
        raise HTTPException(status_code=404, detail=message)

    post_offices = payload.get("PostOffice") or []
    if not isinstance(post_offices, list):
        raise HTTPException(status_code=502, detail="Postal API returned invalid post office data")

    # Prefer postal office name for frontend zone display; fallback to block if needed.
    names = [po.get("Name") or po.get("Block") for po in post_offices if isinstance(po, dict)]
    zones = sorted({name.strip() for name in names if isinstance(name, str) and name.strip()})

    if not zones:
        raise HTTPException(status_code=404, detail="No zones found for this pincode")

    return {"zones": zones}
