import secrets

from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db.models import Count, Max
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment

from .models import Partner, PartnerUser
from .permissions import IsPartnerUser, IsStaff, get_partner_for
from .serializers import (
    PartnerAppointmentSerializer,
    PartnerSerializer,
    PartnerUserSerializer,
)
from .supabase_admin import create_supabase_user


# ---------------------------------------------------------------------------
# Staff management — CRUD for partner clinics and their portal users
# ---------------------------------------------------------------------------

class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [IsStaff]

    @action(detail=True, methods=["get", "post"], url_path="users")
    def users(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            qs = partner.users.select_related("user").order_by("user__email")
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
        link.delete()
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
        return Response(list(rows))


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
        return Response(serializer.data)
