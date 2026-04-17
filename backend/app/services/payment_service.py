from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import datetime
from typing import Any
from urllib.parse import quote, urlencode
from uuid import uuid4

import httpx

from ..config import CFG

logger = logging.getLogger("earnsecure.payments")


class PaymentService:
    """Razorpay + UPI QR payment helper service.

    Uses live Razorpay orders when real credentials are configured,
    and falls back to deterministic demo payloads for local development.
    """

    _razorpay_order_url = "https://api.razorpay.com/v1/orders"

    @property
    def has_live_razorpay(self) -> bool:
        key_id = CFG.RAZORPAY_KEY_ID.strip()
        key_secret = CFG.RAZORPAY_KEY_SECRET.strip()
        if not key_id or not key_secret:
            return False
        if key_id.startswith("rzp_test_example"):
            return False
        if "placeholder" in key_secret.lower():
            return False
        return True

    async def create_razorpay_order(self, rider_id: str, amount_paise: int, notes: dict[str, str] | None = None) -> dict[str, Any]:
        receipt = f"earnsecure-{rider_id}-{uuid4().hex[:10]}"
        payload = {
            "amount": amount_paise,
            "currency": CFG.RAZORPAY_CURRENCY,
            "receipt": receipt,
            "notes": {"rider_id": rider_id, **(notes or {})},
        }

        if not self.has_live_razorpay:
            demo_order_id = f"order_demo_{uuid4().hex[:12]}"
            return {
                "id": demo_order_id,
                "entity": "order",
                "amount": amount_paise,
                "currency": CFG.RAZORPAY_CURRENCY,
                "status": "created",
                "receipt": receipt,
                "created_at": int(datetime.utcnow().timestamp()),
                "demo_mode": True,
            }

        auth = (CFG.RAZORPAY_KEY_ID, CFG.RAZORPAY_KEY_SECRET)
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(self._razorpay_order_url, auth=auth, json=payload)
            response.raise_for_status()
            return response.json()

    def build_upi_uri(self, transaction_ref: str, amount_paise: int, note: str | None = None) -> str:
        amount_inr = f"{amount_paise / 100:.2f}"
        params = {
            "pa": CFG.UPI_PAYEE_VPA,
            "pn": CFG.UPI_PAYEE_NAME,
            "tn": note or "EarnSecure weekly premium",
            "am": amount_inr,
            "cu": CFG.RAZORPAY_CURRENCY,
            "tr": transaction_ref,
        }
        return f"upi://pay?{urlencode(params)}"

    @staticmethod
    def build_qr_image_url(upi_uri: str, size: int = 240) -> str:
        # Stateless QR generation URL used by frontend Image component.
        payload = quote(upi_uri, safe="")
        return f"https://api.qrserver.com/v1/create-qr-code/?size={size}x{size}&data={payload}"

    @staticmethod
    def verify_razorpay_signature(order_id: str, payment_id: str, signature: str, key_secret: str) -> bool:
        generated = hmac.new(
            key_secret.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(generated, signature)


payment_service = PaymentService()
