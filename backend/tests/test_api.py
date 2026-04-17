from __future__ import annotations

import hashlib
import os
from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("ADMIN_SECRET_HASH", hashlib.sha256(b"admin123").hexdigest())

from main import app


client = TestClient(app)


def create_rider_session(phone: str) -> tuple[str, dict[str, str]]:
    send_resp = client.post("/auth/send-otp", json={"phone": phone})
    assert send_resp.status_code == 200
    otp = send_resp.json()["otp"]

    verify_resp = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert verify_resp.status_code == 200
    payload = verify_resp.json()

    rider_id = payload["rider_id"]
    headers = {"Authorization": f"Bearer {payload['access_token']}"}
    return rider_id, headers


def create_admin_session(password: str = "admin123") -> dict[str, str]:
    login_resp = client.post("/admin/login", json={"password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_full_rider_onboarding_policy_and_payment_flow() -> None:
    rider_id, headers = create_rider_session("+91 98765 43210")

    signup_resp = client.post(
        "/auth/complete-signup",
        json={
            "rider_id": rider_id,
            "vehicle_number": "TN09AB1234",
            "legal_name": "Ravi Kumar",
            "password": "pass1234",
        },
        headers=headers,
    )
    assert signup_resp.status_code == 200
    assert signup_resp.json()["success"] is True

    rider_login = client.post(
        "/auth/rider/login",
        json={"phone": "+91 98765 43210", "password": "pass1234"},
    )
    assert rider_login.status_code == 200

    link_resp = client.post(
        "/riders/link-platform",
        json={"platform": "swiggy", "rider_id": rider_id},
        headers=headers,
    )
    assert link_resp.status_code == 200

    update_resp = client.put(
        f"/riders/{rider_id}/profile",
        json={
            "rider_id": rider_id,
            "pin_code": "560034",
            "zones": ["Koramangala", "HSR"],
            "shift_windows": ["evening"],
            "upi_id": "ravi@upi",
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["updated"] is True

    premium_resp = client.post(
        "/premium/calculate",
        json={
            "rider_id": rider_id,
            "pin_code": "560034",
            "shift_windows": ["evening"],
            "zones": ["Koramangala", "HSR"],
        },
        headers=headers,
    )
    assert premium_resp.status_code == 200
    premium_data = premium_resp.json()
    assert premium_data["weekly_premium_paise"] >= 2500

    activate_resp = client.post(
        "/policies/activate",
        json={"rider_id": rider_id, "upi_id": "ravi@upi"},
        headers=headers,
    )
    assert activate_resp.status_code == 200

    current_resp = client.get(f"/policies/{rider_id}/current", headers=headers)
    assert current_resp.status_code == 200
    current = current_resp.json()
    assert current["policy"]["rider_id"] == rider_id

    create_payment_resp = client.post(
        "/payments/upi-qr/create",
        json={
            "rider_id": rider_id,
            "upi_id": "ravi@upi",
            "amount_paise": 6800,
            "note": "weekly premium",
        },
        headers=headers,
    )
    assert create_payment_resp.status_code == 200
    payment = create_payment_resp.json()

    submit_payment_resp = client.post(
        "/payments/upi-qr/submit",
        json={
            "payment_id": payment["payment_id"],
            "rider_id": rider_id,
            "upi_transaction_id": "UPIREF123",
            "payer_upi_id": "ravi@upi",
        },
        headers=headers,
    )
    assert submit_payment_resp.status_code == 200
    assert submit_payment_resp.json()["status"] == "pending_admin_confirmation"

    rider_payments = client.get(f"/payments/rider/{rider_id}", headers=headers)
    assert rider_payments.status_code == 200
    assert len(rider_payments.json()) >= 1


def test_admin_endpoints_and_status_history_flow() -> None:
    rider_id, rider_headers = create_rider_session("+91 97654 32109")

    # Create pending payment so admin confirmation flow can be tested.
    client.post(
        f"/riders/{rider_id}/profile",
        json={
            "rider_id": rider_id,
            "pin_code": "560034",
            "zones": ["Koramangala"],
            "shift_windows": ["evening"],
            "upi_id": "rider@upi",
        },
        headers=rider_headers,
    )
    create_payment_resp = client.post(
        "/payments/upi-qr/create",
        json={
            "rider_id": rider_id,
            "upi_id": "rider@upi",
            "amount_paise": 7200,
        },
        headers=rider_headers,
    )
    payment_id = create_payment_resp.json()["payment_id"]
    client.post(
        "/payments/upi-qr/submit",
        json={
            "payment_id": payment_id,
            "rider_id": rider_id,
            "upi_transaction_id": "UPIREF999",
            "payer_upi_id": "rider@upi",
        },
        headers=rider_headers,
    )

    admin_headers = create_admin_session()

    portfolio = client.get("/admin/portfolio", headers=admin_headers)
    assert portfolio.status_code == 200

    queue = client.get("/admin/fraud-queue", headers=admin_headers)
    assert queue.status_code == 200

    events = client.get("/admin/trigger-events", headers=admin_headers)
    assert events.status_code == 200

    riders = client.get("/admin/riders?query=rider", headers=admin_headers)
    assert riders.status_code == 200

    options = client.get("/admin/account-status-options", headers=admin_headers)
    assert options.status_code == 200

    pending = client.get("/admin/payments/pending", headers=admin_headers)
    assert pending.status_code == 200

    confirm_resp = client.post(
        f"/admin/payments/{payment_id}/confirm",
        json={
            "approve": True,
            "admin_note": "approved from integration test",
            "account_status": "O7_PAYMENT_CONFIRMED_WEEK_ACTIVE",
        },
        headers=admin_headers,
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "confirmed"

    status_override = client.post(
        f"/admin/riders/{rider_id}/account-status",
        json={
            "account_status": "O9_ACCOUNT_SUSPENDED",
            "note": "manual risk hold",
        },
        headers=admin_headers,
    )
    assert status_override.status_code == 200

    history = client.get(f"/admin/riders/{rider_id}/status-history", headers=admin_headers)
    assert history.status_code == 200
    entries = history.json()
    assert isinstance(entries, list)
    assert len(entries) > 0


def test_claim_endpoints_contract() -> None:
    rider_id, rider_headers = create_rider_session("+91 90000 11111")

    client.put(
        f"/riders/{rider_id}/profile",
        json={
            "rider_id": rider_id,
            "pin_code": "560034",
            "zones": ["Koramangala"],
            "shift_windows": ["evening"],
            "upi_id": "claims@upi",
        },
        headers=rider_headers,
    )
    client.post(
        "/policies/activate",
        json={"rider_id": rider_id, "upi_id": "claims@upi"},
        headers=rider_headers,
    )

    admin_headers = create_admin_session()
    fire_resp = client.post(
        "/admin/demo/fire-trigger",
        json={"pin_code": "560034", "trigger_type": "rain"},
        headers=admin_headers,
    )
    assert fire_resp.status_code == 200

    claims_resp = client.get(f"/claims/{rider_id}", headers=rider_headers)
    assert claims_resp.status_code == 200
    claims = claims_resp.json()
    assert isinstance(claims, list)

    if claims:
        detail_resp = client.get(f"/claims/{claims[0]['id']}/detail", headers=rider_headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert "fraud_score" in detail
        assert "fraud_checks" in detail
        assert "trigger_event" in detail
