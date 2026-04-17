from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request

from ..dependencies import get_current_rider_id, get_store
from ..schemas import (
    CreateRazorpayOrderRequest,
    CreateUpiQrPaymentRequest,
    PaymentRecordResponse,
    SubmitUpiQrTransactionRequest,
)
from ..storage import InMemoryStore

router = APIRouter(prefix="/payments", tags=["payments"])


def _serialize_payment(record, account_status: str | None = None) -> PaymentRecordResponse:
    return PaymentRecordResponse(
        payment_id=record.payment_id,
        rider_id=record.rider_id,
        provider=record.provider,
        status=record.status,
        amount_paise=record.amount_paise,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
        upi_uri=record.upi_uri,
        qr_image_url=record.qr_image_url,
        upi_transaction_id=record.upi_transaction_id,
        payer_upi_id=record.payer_upi_id,
        razorpay_order_id=record.razorpay_order_id,
        razorpay_payment_id=record.razorpay_payment_id,
        checkout_key=record.checkout_key,
        checkout_url=record.checkout_url,
        account_status=account_status,
        admin_note=record.admin_note,
    )


@router.post("/upi-qr/create", response_model=PaymentRecordResponse)
async def create_upi_qr_payment(
    payload: CreateUpiQrPaymentRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> PaymentRecordResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")

    try:
        payment = store.create_upi_qr_payment(
            rider_id=payload.rider_id,
            upi_id=payload.upi_id,
            amount_paise=payload.amount_paise,
            note=payload.note,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc

    rider = store.riders.get(payment.rider_id)
    return _serialize_payment(payment, rider.account_status if rider else None)


@router.post("/upi-qr/submit", response_model=PaymentRecordResponse)
async def submit_upi_qr_transaction(
    payload: SubmitUpiQrTransactionRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> PaymentRecordResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")

    try:
        payment = store.submit_upi_qr_transaction(
            payment_id=payload.payment_id,
            rider_id=payload.rider_id,
            upi_transaction_id=payload.upi_transaction_id,
            payer_upi_id=payload.payer_upi_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="payment not found") from exc

    rider = store.riders.get(payment.rider_id)
    return _serialize_payment(payment, rider.account_status if rider else None)


@router.post("/razorpay/create-order", response_model=PaymentRecordResponse)
async def create_razorpay_order(
    payload: CreateRazorpayOrderRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> PaymentRecordResponse:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")

    try:
        payment = await store.create_razorpay_payment(
            rider_id=payload.rider_id,
            amount_paise=payload.amount_paise,
            upi_id=payload.upi_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc

    rider = store.riders.get(payment.rider_id)
    return _serialize_payment(payment, rider.account_status if rider else None)


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, store: InMemoryStore = Depends(get_store)) -> dict:
    raw_body = await request.body()
    payload = json.loads(raw_body.decode("utf-8") or "{}")

    event_name = payload.get("event")
    if event_name != "payment.captured":
        return {"received": True, "ignored": True}

    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    razorpay_payment_id = payment_entity.get("id")

    if not order_id:
        return {"received": True, "ignored": True}

    matched = None
    for payment in store.payments.values():
        if payment.razorpay_order_id == order_id:
            matched = payment
            break

    if not matched:
        return {"received": True, "ignored": True}

    matched.razorpay_payment_id = razorpay_payment_id
    store.confirm_payment(
        payment_id=matched.payment_id,
        admin_id="razorpay_webhook",
        approve=True,
        admin_note="Razorpay webhook payment.captured",
    )

    return {"received": True, "payment_id": matched.payment_id}


@router.get("/id/{payment_id}", response_model=PaymentRecordResponse)
async def get_payment(
    payment_id: str,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> PaymentRecordResponse:
    try:
        payment = store.get_payment(payment_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="payment not found") from exc

    if payment.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")

    rider = store.riders.get(payment.rider_id)
    return _serialize_payment(payment, rider.account_status if rider else None)


@router.get("/rider/{rider_id}", response_model=list[PaymentRecordResponse])
async def list_rider_payments(
    rider_id: str,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> list[PaymentRecordResponse]:
    if rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")

    rows = []
    for payment in store.list_rider_payments(rider_id):
        rider = store.riders.get(payment.rider_id)
        rows.append(_serialize_payment(payment, rider.account_status if rider else None))
    return rows
