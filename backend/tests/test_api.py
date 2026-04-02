from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


client = TestClient(app)


def test_full_rider_onboarding_and_claim_flow() -> None:
    # 1) OTP auth
    phone = "+91 98765 43210"
    send_resp = client.post("/auth/send-otp", json={"phone": phone})
    assert send_resp.status_code == 200
    otp = send_resp.json()["otp"]

    verify_resp = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert verify_resp.status_code == 200
    session = verify_resp.json()
    rider_id = session["rider_id"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    session_resp = client.get("/auth/session", headers=headers)
    assert session_resp.status_code == 200
    assert session_resp.json()["rider_id"] == rider_id

    # 2) Link platform + profile
    link_resp = client.post("/riders/link-platform", json={"platform": "swiggy", "rider_id": rider_id}, headers=headers)
    assert link_resp.status_code == 200
    activity = link_resp.json()["activity_summary"]
    assert activity["d30_orders"] > 0

    update_resp = client.put(
        f"/riders/{rider_id}/profile",
        json={
            "rider_id": rider_id,
            "pin_code": "600042",
            "shift_window": "morning",
            "upi_id": "ravi.kumar@upi",
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["updated"] is True

    # 3) Premium + policy
    premium_resp = client.post("/premium/calculate", json={"rider_id": rider_id}, headers=headers)
    assert premium_resp.status_code == 200
    premium_data = premium_resp.json()
    assert premium_data["premium_paise"] >= 2500
    assert len(premium_data["covers"]) == 6

    activate_resp = client.post("/policies/activate", json={"rider_id": rider_id, "upi_id": "ravi.kumar@upi"}, headers=headers)
    assert activate_resp.status_code == 200
    policy_id = activate_resp.json()["policy_id"]
    assert policy_id

    current_resp = client.get(f"/policies/{rider_id}/current", headers=headers)
    assert current_resp.status_code == 200
    current = current_resp.json()
    assert current["policy"]["rider_id"] == rider_id
    assert len(current["trigger_statuses"]) == 6


def test_admin_trigger_monitor_and_fraud_queue_flow() -> None:
    phone = "+91 97654 32109"
    send_resp = client.post("/auth/send-otp", json={"phone": phone})
    assert send_resp.status_code == 200
    otp = send_resp.json()["otp"]

    verify_resp = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert verify_resp.status_code == 200
    headers = {"Authorization": f"Bearer {verify_resp.json()['access_token']}"}

    portfolio_before = client.get("/admin/portfolio", headers=headers)
    assert portfolio_before.status_code == 200

    fire_resp = client.post("/admin/demo/fire-trigger", json={"pin_code": "560034", "trigger_type": "rain"}, headers=headers)
    assert fire_resp.status_code == 200
    fired_event_id = fire_resp.json()["event_id"]

    events_resp = client.get("/admin/trigger-events", headers=headers)
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert any(event["event_id"] == fired_event_id for event in events)

    fraud_queue_resp = client.get("/admin/fraud-queue", headers=headers)
    assert fraud_queue_resp.status_code == 200
    queue = fraud_queue_resp.json()

    # Approve or reject one queued claim if present
    if queue:
        claim_id = queue[0]["id"]
        approve_resp = client.post(
            f"/admin/claims/{claim_id}/approve",
            json={"reviewer_note": "integration-test"},
            headers=headers,
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["approved"] is True

    portfolio_after = client.get("/admin/portfolio", headers=headers)
    assert portfolio_after.status_code == 200


def test_claims_endpoints_contract() -> None:
    phone = "+91 90000 11111"
    send_resp = client.post("/auth/send-otp", json={"phone": phone})
    assert send_resp.status_code == 200
    otp = send_resp.json()["otp"]

    verify_resp = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert verify_resp.status_code == 200
    headers = {"Authorization": f"Bearer {verify_resp.json()['access_token']}"}

    claims_resp = client.get("/claims/rider-001", headers=headers)
    assert claims_resp.status_code == 200
    claims = claims_resp.json()
    assert isinstance(claims, list)

    if claims:
        detail_resp = client.get(f"/claims/{claims[0]['id']}/detail", headers=headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert "fraud_score" in detail
        assert "fraud_checks" in detail
        assert "trigger_event" in detail
