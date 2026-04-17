from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Response

from ..dependencies import get_current_rider_id, get_store
from ..schemas import OutboundIvrCallRequest
from ..services.ivr_service import build_incoming_call_twiml, build_process_input_twiml, place_outbound_ivr_call
from ..storage import InMemoryStore

router = APIRouter(prefix="/ivr", tags=["ivr"])


@router.post("/incoming-call")
async def incoming_call(
    From: str | None = Form(default=None),
    store: InMemoryStore = Depends(get_store),
) -> Response:
    twiml = build_incoming_call_twiml(store=store, from_phone=From)
    return Response(content=twiml, media_type="application/xml")


@router.post("/process-input")
async def process_input(
    Digits: str | None = Form(default=None),
    From: str | None = Form(default=None),
    store: InMemoryStore = Depends(get_store),
) -> Response:
    twiml = build_process_input_twiml(store=store, digits=Digits, from_phone=From)
    return Response(content=twiml, media_type="application/xml")


@router.post("/call-rider")
async def call_rider(
    payload: OutboundIvrCallRequest,
    _: str = Depends(get_current_rider_id),
) -> dict:
    return place_outbound_ivr_call(phone_number=payload.phone, rider_id=payload.rider_id)
