from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_store
from ..schemas import SendOtpRequest, VerifyOtpRequest, VerifyOtpResponse
from ..storage import InMemoryStore

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest, store: InMemoryStore = Depends(get_store)) -> dict:
    otp = store.issue_otp(payload.phone)
    return {"sent": True, "otp": otp}


@router.post("/verify-otp", response_model=VerifyOtpResponse)
async def verify_otp(payload: VerifyOtpRequest, store: InMemoryStore = Depends(get_store)) -> VerifyOtpResponse:
    try:
        rider_id = store.verify_otp(payload.phone, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    # TODO: Issue a signed JWT. Using a demo token for now.
    return VerifyOtpResponse(access_token=f"dev-token-{rider_id}", rider_id=rider_id)
