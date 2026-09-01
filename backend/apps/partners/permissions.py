from rest_framework.permissions import SAFE_METHODS, BasePermission


def get_partner_for(user):
    """Return the active Partner linked to this user, or None."""
    if not user or not getattr(user, "is_authenticated", False):
        return None
    link = getattr(user, "partner_link", None)
    if link is None or not link.partner.is_active:
        return None
    return link.partner


class IsPartnerUser(BasePermission):
    """Read-only access for users linked to an active partner clinic."""

    message = "Solo clínicas asociadas pueden acceder, y únicamente en modo lectura."

    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return False
        return get_partner_for(request.user) is not None


class IsStaff(BasePermission):
    """Clinic staff only (mirrors the is_staff checks used across the API)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsPartnerUserReadWrite(BasePermission):
    """Like IsPartnerUser but also allows write methods. Used only for a
    partner's own notification read-state — never for referred-patient
    data, which must stay read-only via IsPartnerUser."""

    message = "Solo clínicas asociadas pueden acceder."

    def has_permission(self, request, view):
        return get_partner_for(request.user) is not None
