from __future__ import annotations

import logging

from twilio.rest import Client
from twilio.twiml.voice_response import Gather, VoiceResponse

from ..config import CFG

logger = logging.getLogger("earnsecure.ivr")


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit() or ch == "+")


def _find_rider_by_phone(store, phone: str):
    normalized = _normalize_phone(phone)
    for rider in store.riders.values():
        if _normalize_phone(rider.phone) == normalized:
            return rider
    return None


def build_incoming_call_twiml(store, from_phone: str | None = None) -> str:
    rider = _find_rider_by_phone(store, from_phone or "") if from_phone else None

    response = VoiceResponse()
    if rider:
        response.say(
            f"Welcome to Earn Secure support. Hello rider {rider.rider_id}. "
            "Press 1 for policy status. Press 2 for latest payout. Press 3 to request a support callback.",
            voice="alice",
            language="en-IN",
        )
    else:
        response.say(
            "Welcome to Earn Secure support. Press 1 for policy status. "
            "Press 2 for latest payout. Press 3 to request a support callback.",
            voice="alice",
            language="en-IN",
        )

    gather = Gather(num_digits=1, action="/ivr/process-input", method="POST", timeout=7)
    response.append(gather)
    response.redirect("/ivr/incoming-call", method="POST")
    return str(response)


def build_process_input_twiml(store, digits: str | None, from_phone: str | None = None) -> str:
    rider = _find_rider_by_phone(store, from_phone or "") if from_phone else None
    response = VoiceResponse()

    if digits == "1":
        if not rider:
            response.say("Policy status is unavailable because we could not match your rider profile.")
        else:
            policy = store.current_policy(rider.rider_id)
            response.say(
                f"Your policy status is {policy.status}. "
                f"Next weekly premium is rupees {policy.next_premium / 100:.0f}.",
                voice="alice",
                language="en-IN",
            )
    elif digits == "2":
        if not rider:
            response.say("Latest payout details are unavailable for this number.")
        else:
            claims = store.list_claims(rider.rider_id)
            claims.sort(key=lambda claim: claim.created_at, reverse=True)
            if claims:
                latest = claims[0]
                response.say(
                    f"Your latest payout is rupees {latest.amount_paise / 100:.0f} for {latest.trigger_type}. "
                    f"Claim status is {latest.status}.",
                    voice="alice",
                    language="en-IN",
                )
            else:
                response.say("No payouts were found in your account yet.", voice="alice", language="en-IN")
    elif digits == "3":
        response.say(
            "A callback request has been recorded. Our operations team will call you back shortly.",
            voice="alice",
            language="en-IN",
        )
    else:
        response.say("Invalid input. Please try again.", voice="alice", language="en-IN")

    response.say("Thank you for calling Earn Secure.", voice="alice", language="en-IN")
    response.hangup()
    return str(response)


def place_outbound_ivr_call(phone_number: str, rider_id: str | None = None) -> dict:
    if not CFG.TWILIO_ACCOUNT_SID or not CFG.TWILIO_AUTH_TOKEN or not CFG.TWILIO_VOICE_FROM_PHONE:
        logger.warning("Twilio voice credentials missing; returning demo call payload")
        return {
            "queued": True,
            "demo_mode": True,
            "sid": f"CA_DEMO_{(rider_id or 'GEN')}",
            "to": phone_number,
        }

    call_url = f"{CFG.TWILIO_WEBHOOK_BASE_URL.rstrip('/')}/ivr/incoming-call"

    client = Client(CFG.TWILIO_ACCOUNT_SID, CFG.TWILIO_AUTH_TOKEN)
    call = client.calls.create(
        to=phone_number,
        from_=CFG.TWILIO_VOICE_FROM_PHONE,
        url=call_url,
        method="POST",
    )

    return {
        "queued": True,
        "demo_mode": False,
        "sid": call.sid,
        "to": phone_number,
    }
