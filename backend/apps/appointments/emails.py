"""Result-ready email notifications, sent to the referring partner clinic
and (optionally) directly to the patient when staff upload a report.

Each recipient is sent independently — one failure (or a missing address)
never blocks the other, or the report upload itself. Every attempt is
logged and returned so the caller can persist it to the audit trail;
nothing is swallowed silently.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _send(kind, to, subject, template, context):
    """Attempt one email send. Returns a dict describing the outcome —
    never raises, so callers can always log+continue."""
    logger.info("Enviando correo de resultados (%s) a %s — asunto: %r", kind, to, subject)
    try:
        html = render_to_string(template, context)
        message = EmailMultiAlternatives(
            subject=subject,
            body=strip_tags(html),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        message.attach_alternative(html, "text/html")
        sent_count = message.send()
        if sent_count != 1:
            # send() didn't raise but also didn't report a delivery — the
            # backend accepted 0 messages (e.g. an invalid address it
            # decided to skip). Treat as a failure so it surfaces in audit.
            raise RuntimeError(f"backend.send() returned {sent_count}, expected 1")
        logger.info("Correo de resultados (%s) enviado a %s", kind, to)
        return {"kind": kind, "to": to, "success": True, "error": None}
    except Exception as exc:
        logger.exception("Falló el envío del correo de resultados (%s) a %s", kind, to)
        return {"kind": kind, "to": to, "success": False, "error": str(exc)}


def send_result_ready_emails(report, notify_patient=False):
    """Notify the referring partner clinic (mandatory, if it has an email on
    file) and, optionally, the patient directly. Walk-in appointments (no
    referring partner) always email the patient, since there's no clinic to
    notify otherwise.

    Returns a list of per-recipient attempt dicts:
    {"kind": "partner"|"patient", "to": str|None, "success": bool, "error": str|None}
    — including recipients that were skipped for lack of an email address,
    so the caller can log *why* nothing went out, not just that nothing did.
    """
    appointment = report.appointment
    partner = appointment.referring_partner
    study_type = appointment.service.name

    logger.info(
        "Preparando correos de resultados para la cita #%s (clínica=%s, notify_patient=%s, "
        "EMAIL_BACKEND=%s, EMAIL_HOST_USER=%s)",
        appointment.id,
        partner.name if partner else None,
        notify_patient,
        settings.EMAIL_BACKEND,
        settings.EMAIL_HOST_USER or "(vacío)",
    )

    logo_url = f"{settings.SITE_URL}/static/react/images/logo.png"
    login_url = f"{settings.SITE_URL}/login"
    base_context = {
        "logo_url": logo_url,
        "login_url": login_url,
        "patient_name": appointment.patient_name,
        "study_type": study_type,
    }

    attempts = []

    if partner:
        if partner.email:
            attempts.append(
                _send(
                    kind="partner",
                    to=partner.email,
                    subject=f"Resultados disponibles — {appointment.patient_name}",
                    template="emails/result_ready_partner.html",
                    context={**base_context, "clinic_name": partner.name},
                )
            )
        else:
            logger.warning(
                "La clínica asociada “%s” (#%s) no tiene correo configurado — "
                "no se envió notificación de resultados para la cita #%s",
                partner.name,
                partner.id,
                appointment.id,
            )
            attempts.append(
                {
                    "kind": "partner",
                    "to": None,
                    "success": False,
                    "error": "La clínica no tiene correo configurado.",
                }
            )

    should_email_patient = notify_patient or partner is None
    if should_email_patient:
        if appointment.patient_email:
            attempts.append(
                _send(
                    kind="patient",
                    to=appointment.patient_email,
                    subject="Tus resultados ya están disponibles",
                    template="emails/result_ready_patient.html",
                    context=base_context,
                )
            )
        else:
            logger.warning(
                "La cita #%s no tiene correo de paciente registrado — "
                "no se envió notificación de resultados al paciente",
                appointment.id,
            )
            attempts.append(
                {
                    "kind": "patient",
                    "to": None,
                    "success": False,
                    "error": "El paciente no tiene correo registrado.",
                }
            )

    return attempts
