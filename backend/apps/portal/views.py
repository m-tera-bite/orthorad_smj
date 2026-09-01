from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.appointments.models import Report
from apps.appointments.serializers import ReportFileSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_action

from .models import PatientProfile
from .serializers import (
    PatientProfileSerializer,
    PortalReportLookupRequestSerializer,
    RegisterSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = PatientProfile.objects.get_or_create(user=request.user)
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data)


class PortalReportLookupView(APIView):
    """Public guest lookup: a patient proves they're who they say they are
    with DOB + the per-result access code emailed/handed to them, no login
    involved. Deliberately generic on failure (never reveals whether the DOB
    or the code was the wrong part) and rate-limited, since code length alone
    (a short, human-friendly format) isn't strong enough on its own."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "portal_lookup"

    GENERIC_ERROR = "Código de expediente no encontrado. Verifica tus datos."

    def post(self, request):
        serializer = PortalReportLookupRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dob = serializer.validated_data["date_of_birth"]
        code = serializer.validated_data["code"].strip()

        report = (
            Report.objects.select_related("appointment", "appointment__service")
            .filter(
                access_code__iexact=code,
                appointment__date_of_birth=dob,
                # SoftDeleteModel's manager-level filtering doesn't apply
                # across a relation-filter join like appointment__..., so a
                # soft-deleted patient's results must be excluded explicitly.
                appointment__deleted_at__isnull=True,
                uploaded_at__isnull=False,
            )
            .first()
        )

        if report is None:
            log_action(
                request,
                AuditLog.Action.VIEW,
                object_type="report_lookup",
                object_id=code,
                description="Búsqueda de resultados fallida (portal de clientes)",
                details={"exito": False},
            )
            return Response({"detail": self.GENERIC_ERROR}, status=404)

        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="report_lookup",
            object_id=code,
            description="Búsqueda de resultados exitosa (portal de clientes)",
            details={"exito": True, "cita": report.appointment_id},
        )
        appointment = report.appointment
        return Response(
            {
                "patient_name": appointment.patient_name,
                "service_name": appointment.service.name,
                "scheduled_at": appointment.scheduled_at,
                "uploaded_at": report.uploaded_at,
                "files": ReportFileSerializer(report.files.all(), many=True).data,
            }
        )
