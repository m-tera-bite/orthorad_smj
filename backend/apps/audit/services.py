"""Helper to record audit entries from views.

Logging must never break the request that triggered it, so any exception
raised while writing the entry is swallowed (and logged to the app log).
"""

import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or None


def _actor_role(user):
    if not user or not getattr(user, "is_authenticated", False):
        return AuditLog.Role.PUBLIC
    if user.is_staff:
        return AuditLog.Role.STAFF
    if getattr(user, "partner_link", None) is not None:
        return AuditLog.Role.PARTNER
    return AuditLog.Role.PATIENT


def log_action(request, action, object_type="", object_id="", description="", details=None):
    """Insert one audit row. Safe to call from any view."""
    try:
        user = getattr(request, "user", None)
        authenticated = bool(user and getattr(user, "is_authenticated", False))
        return AuditLog.objects.create(
            actor=user if authenticated else None,
            actor_email=(user.email or user.username) if authenticated else "",
            actor_role=_actor_role(user),
            action=action,
            object_type=object_type,
            object_id=str(object_id) if object_id is not None else "",
            description=description[:500],
            details=details or {},
            ip_address=_client_ip(request),
        )
    except Exception:  # pragma: no cover — auditing must never break requests
        logger.exception("No se pudo registrar la entrada de auditoría")
        return None
