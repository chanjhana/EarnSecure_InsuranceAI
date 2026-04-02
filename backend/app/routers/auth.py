import hashlib
import os
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_store, get_token_payload
from ..schemas import (
    AdminLoginRequest,
    AuthSessionResponse,
    RiderInfoRequest,
    RiderLoginRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from ..security import create_access_token, hash_password, verify_password
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


@router.post("/complete-signup")
async def complete_signup(payload: RiderInfoRequest, store: InMemoryStore = Depends(get_store)):
    rider = store.riders.get(payload.rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    rider.legal_name = payload.legal_name
    rider.vehicle_number = payload.vehicle_number
    rider.password_hash = hash_password(payload.password)
    return {"success": True}


@router.post("/rider/login", response_model=VerifyOtpResponse)
async def rider_login(payload: RiderLoginRequest, store: InMemoryStore = Depends(get_store)):
    # Find rider by phone
    rider = None
    for r in store.riders.values():
        if r.phone == payload.phone:
            rider = r
            break

    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    if not rider.password_hash:
        raise HTTPException(status_code=400, detail="Account not fully set up. Please complete signup.")

    if not verify_password(payload.password, rider.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    return VerifyOtpResponse(access_token=create_access_token(rider.rider_id, rider.phone), rider_id=rider.rider_id)


@router.post("/admin/login")
async def admin_login(payload: AdminLoginRequest, store: InMemoryStore = Depends(get_store)):

    admin_secret_hash = os.getenv("ADMIN_SECRET_HASH")

    incoming_pass_hashed = hashlib.sha256(payload.password.encode()).hexdigest()

    if incoming_pass_hashed != admin_secret_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # In a real app, you'd return a token for a specific admin user
    return {"access_token": create_access_token("admin", "admin"), "token_type": "bearer"}


@router.get("/session", response_model=AuthSessionResponse)
async def auth_session(payload: dict = Depends(get_token_payload)) -> AuthSessionResponse:
    rider_id = payload.get("sub")
    phone = payload.get("phone")
    token_type = payload.get("type")

    if not rider_id or not phone or token_type != "access":
        raise HTTPException(status_code=401, detail="invalid token payload")

    return AuthSessionResponse(rider_id=rider_id, phone=phone, token_type="access")
