from django.conf import settings
from django.core.mail import send_mail

import logging
import os

logger = logging.getLogger(__name__)


def send_otp(user, code: str) -> None:
    """Send OTP to user via email and (optionally) SMS.

    - Email: uses Django's configured EMAIL_BACKEND. In dev, console backend is fine.
    - SMS: if TWILIO_* env vars are present and 'twilio' is installed, send SMS.
    """
    subject = "Your verification code"
    message = f"Your verification code is: {code}. It expires in 10 minutes."

    # Send email if user has an email
    recipient = getattr(user, "email", None)
    if recipient:
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                fail_silently=False,
            )
            logger.info("Sent OTP email to %s", recipient)
        except Exception:
            logger.exception("Failed to send OTP email to %s", recipient)

    # Send SMS via Twilio if configured and user has a phone number
    phone = getattr(user, "phone_number", None)
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER")

    if phone and sid and token and from_number:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(sid, token)
            client.messages.create(
                body=message,
                from_=from_number,
                to=phone,
            )
            logger.info("Sent OTP SMS to %s", phone)
        except ImportError:
            logger.warning("twilio package not installed; cannot send SMS. Install 'twilio' to enable.")
        except Exception:
            logger.exception("Failed to send OTP SMS to %s", phone)
