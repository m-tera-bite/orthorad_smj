import secrets

from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.audit.services import log_action

from .models import Notification, Partner, PartnerUser
from .permissions import IsPartnerUser, IsPartnerUserReadWrite, IsStaff, get_partner_for
from .serializers import (
    NotificationSerializer,
    PartnerAppointmentSerializer,
    PartnerSerializer,
    PartnerUserSerializer,
)
from .supabase_admin import create_supabase_user

_PARTNER_TRACKED_FIELDS = ["name", "contact_name", "email", "phone", "is_active"]


def _partner_snapshot(partner):
    return {
        "id": partner.id,
        "nombre": partner.name,
        "contacto": partner.contact_name,
        "correo": partner.email,
        "telefono": partner.phone,
        "activa": partner.is_active,
        "accesos": [link.user.email for link in partner.users.select_related("user")],
    }


# ---------------------------------------------------------------------------
# Staff management — CRUD for partner clinics and their portal users
# ---------------------------------------------------------------------------

class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [IsStaff]

    # ------------------------------------------------------------------
    # Auditing hooks
    # ------------------------------------------------------------------

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="partner",
            description="Consultó el listado de clínicas asociadas",
            details={"resultados": len(response.data)},
        )
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="partner",
            object_id=kwargs.get("pk", ""),
            description=f"Consultó la clínica asociada #{kwargs.get('pk', '')}",
        )
        return response

    def perform_create(self, serializer):
        partner = serializer.save()
        log_action(
            self.request,
            AuditLog.Action.CREATE,
            object_type="partner",
            object_id=partner.id,
            description=f"Creó la clínica asociada “{partner.name}”",
            details={"clinica": _partner_snapshot(partner)},
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_values = {f: getattr(instance, f) for f in _PARTNER_TRACKED_FIELDS}

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        instance.refresh_from_db()

        changes = {}
        for field, old in old_values.items():
            new = getattr(instance, field)
            if new != old:
                changes[field] = {"antes": old, "despues": new}

        if changes:
            log_action(
                request,
                AuditLog.Action.UPDATE,
                object_type="partner",
                object_id=instance.id,
                description=f"Editó la clínica asociada “{instance.name}”",
                details={"cambios": changes},
            )
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        partner = self.get_object()
        snapshot = _partner_snapshot(partner)
        # Soft delete + deactivate: the clinic disappears from the dashboard
        # and its portal users immediately lose access, but the record (and
        # the appointments it referred) stay in the database.
        partner.is_active = False
        partner.save(update_fields=["is_active"])
        partner.soft_delete(request.user)
        log_action(
            request,
            AuditLog.Action.DELETE,
            object_type="partner",
            object_id=partner.id,
            description=f"Eliminó la clínica asociada “{partner.name}”",
            details={"clinica_eliminada": snapshot},
        )
        return Response(status=204)

    @action(detail=True, methods=["get", "post"], url_path="users")
    def users(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            qs = partner.users.select_related("user").order_by("user__email")
            log_action(
                request,
                AuditLog.Action.VIEW,
                object_type="partner_user",
                object_id=partner.id,
                description=f"Consultó los accesos de la clínica “{partner.name}”",
            )
            return Response(PartnerUserSerializer(qs, many=True).data)

        # POST — link (and provision) a partner portal user by email
        email = (request.data.get("email") or "").strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Correo electrónico inválido."}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user, _ = User.objects.get_or_create(
                username=email, defaults={"email": email}
            )
            if not user.email:
                user.email = email
                user.save(update_fields=["email"])
        if user.is_staff:
            return Response(
                {"detail": "Ese correo pertenece a un usuario del personal de la clínica."},
                status=400,
            )
        if hasattr(user, "partner_link"):
            return Response(
                {"detail": "Ese correo ya está vinculado a una clínica asociada."},
                status=400,
            )

        link = PartnerUser.objects.create(user=user, partner=partner)

        password = (request.data.get("password") or "").strip() or secrets.token_urlsafe(9)
        supabase_created, supabase_message = create_supabase_user(email, password)

        log_action(
            request,
            AuditLog.Action.CREATE,
            object_type="partner_user",
            object_id=link.id,
            description=f"Otorgó acceso al portal de “{partner.name}” a {email}",
            details={"correo": email, "clinica": partner.name},
        )

        payload = PartnerUserSerializer(link).data
        payload["supabase_created"] = supabase_created
        payload["supabase_message"] = supabase_message
        if supabase_created:
            # Shown once to staff so they can hand credentials to the partner.
            payload["temp_password"] = password
        return Response(payload, status=201)

    @action(detail=True, methods=["delete"], url_path=r"users/(?P<link_id>\d+)")
    def remove_user(self, request, pk=None, link_id=None):
        partner = self.get_object()
        try:
            link = partner.users.get(pk=link_id)
        except PartnerUser.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=404)
        removed_email = link.user.email
        link.delete()
        log_action(
            request,
            AuditLog.Action.DELETE,
            object_type="partner_user",
            object_id=link_id,
            description=f"Quitó el acceso al portal de “{partner.name}” a {removed_email}",
            details={"correo": removed_email, "clinica": partner.name},
        )
        return Response(status=204)


# ---------------------------------------------------------------------------
# Partner portal — strictly read-only, always scoped to the caller's clinic
# ---------------------------------------------------------------------------

class PartnerMeView(APIView):
    permission_classes = [IsPartnerUser]

    def get(self, request):
        partner = get_partner_for(request.user)
        return Response(
            {
                "partner": {"id": partner.id, "name": partner.name},
                "user": {
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                },
            }
        )


class PartnerPatientsView(APIView):
    """Distinct patients referred by the caller's clinic."""

    permission_classes = [IsPartnerUser]

    def get(self, request):
        partner = get_partner_for(request.user)
        rows = (
            Appointment.objects.filter(referring_partner=partner)
            .values("patient_name", "patient_email", "patient_phone")
            .annotate(
                appointment_count=Count("id"),
                last_appointment=Max("scheduled_at"),
            )
            .order_by("patient_name")
        )
        rows = list(rows)
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="partner_portal",
            object_id=partner.id,
            description=f"La clínica “{partner.name}” consultó sus pacientes referidos",
            details={"resultados": len(rows)},
        )
        return Response(rows)


class PartnerAppointmentsView(APIView):
    """Appointments (with reports and result files) referred by the caller's
    clinic. Results of the same patient referred by another clinic are
    excluded by construction."""

    permission_classes = [IsPartnerUser]

    def get(self, request):
        partner = get_partner_for(request.user)
        qs = (
            Appointment.objects.filter(referring_partner=partner)
            .select_related("service", "report")
            .prefetch_related("report__files")
            .order_by("-scheduled_at")
        )
        patient_email = request.query_params.get("patient_email")
        if patient_email:
            qs = qs.filter(patient_email__iexact=patient_email)
        serializer = PartnerAppointmentSerializer(qs, many=True, context={"request": request})
        details = {"resultados": len(serializer.data)}
        if patient_email:
            details["paciente"] = patient_email
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="partner_portal",
            object_id=partner.id,
            description=f"La clínica “{partner.name}” consultó resultados de sus referidos",
            details=details,
        )
        return Response(serializer.data)


class PartnerNotificationsView(APIView):
    """Recent 'new results ready' notifications for the caller's clinic."""

    permission_classes = [IsPartnerUser]

    def get(self, request):
        partner = get_partner_for(request.user)
        qs = Notification.objects.filter(partner=partner).select_related("appointment")[:20]
        unread_count = Notification.objects.filter(partner=partner, read_at__isnull=True).count()
        return Response(
            {
                "results": NotificationSerializer(qs, many=True).data,
                "unread_count": unread_count,
            }
        )


class PartnerNotificationMarkReadView(APIView):
    """Marks one notification as read. Scoped to the caller's own clinic —
    a partner can never mark (or discover the existence of) another
    clinic's notification."""

    permission_classes = [IsPartnerUserReadWrite]

    def post(self, request, pk):
        partner = get_partner_for(request.user)
        notification = get_object_or_404(Notification, pk=pk, partner=partner)
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)
