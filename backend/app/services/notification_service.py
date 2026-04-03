import os
import logging
import threading
from twilio.rest import Client

logger = logging.getLogger("earnsecure.notifications")

def send_claim_sms(phone_number: str, amount_paise: int, trigger_type: str):
    """
    Sends an SMS via Twilio to the rider. Runs in a safe thread so it 
    never blocks the scheduler or the API.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_phone = os.getenv("TWILIO_FROM_PHONE")

    if not account_sid or not auth_token or not from_phone:
        logger.warning(f"Twilio credentials missing. Skipped sending SMS to {phone_number}.")
        return

    # Trigger Types nicely mapped to strings
    trigger_map = {
        "rain": "Severe Rain",
        "heat": "Extreme Heatwave",
        "fog": "Low Visibility/Fog",
        "aqi": "Toxic Air Quality",
        "outage": "Platform Outage"
    }
    event_name = trigger_map.get(trigger_type, trigger_type.capitalize())
    amount_inr = amount_paise / 100

    def _dispatch():
        try:
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=f"EarnSecure Auto-Claim: A {event_name} alert has been verified! ₹{amount_inr} has been instantly credited to your linked UPI. Stay safe!",
                from_=from_phone,
                to=phone_number
            )
            logger.info(f"SMS sent successfully to {phone_number}! Message SID: {message.sid}")
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}. Error: {e}")

    # Fire and forget thread so API latency isn't bottlenecked by Twilio
    thread = threading.Thread(target=_dispatch)
    thread.daemon = True
    thread.start()
