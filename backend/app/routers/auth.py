from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_store, get_token_payload
from ..schemas import AuthSessionResponse, SendOtpRequest, VerifyOtpRequest, VerifyOtpResponse
from ..security import create_access_token
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
    return VerifyOtpResponse(access_token=create_access_token(rider_id, payload.phone), rider_id=rider_id)


@router.get("/session", response_model=AuthSessionResponse)
async def auth_session(payload: dict = Depends(get_token_payload)) -> AuthSessionResponse:
    rider_id = payload.get("sub")
    phone = payload.get("phone")
    token_type = payload.get("type")

    if not rider_id or not phone or token_type != "access":
        raise HTTPException(status_code=401, detail="invalid token payload")

    return AuthSessionResponse(rider_id=rider_id, phone=phone, token_type="access")
