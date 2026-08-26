from datetime import timedelta

from django.db.models import Count, Max
from django.utils import timezone
from django.utils.timezone import localdate
from rest_framework import viewsets, permissions
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.portal.models import PatientProfile

from .models import Appointment, Report, ReportFile, Service
from .serializers import AppointmentSerializer, ReportFileSerializer, ReportSerializer, ServiceSerializer

# Fields tracked when diffing appointment edits for the audit trail.
_APPOINTMENT_TRACKED_FIELDS = [
    "patient_name",
    "patient_email",
    "patient_phone",
    "service_id",
    "referring_partner_id",
    "scheduled_at",
    "notes",
    "room",
    "status",
]


def _fmt(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _appointment_snapshot(appointment):
    """JSON-serializable copy of an appointment (and its result files) as it
    was at the moment of the action — stored in the audit trail so deleted
    data can always be reviewed."""
    try:
        report = appointment.report
        files = [
            {"id": f.id, "nombre": f.original_name or f.file.name}
            for f in report.files.all()
        ]
    except Report.DoesNotExist:
        files = []
    return {
        "id": appointment.id,
        "paciente": appointment.patient_name,
        "correo": appointment.patient_email,
        "telefono": appointment.patient_phone,
        "servicio": appointment.service.name if appointment.service_id else None,
        "clinica_referente": (
            appointment.referring_partner.name if appointment.referring_partner_id else None
        ),
        "fecha": _fmt(appointment.scheduled_at),
        "sala": appointment.room,
        "estado": appointment.status,
        "notas": appointment.notes,
        "creada": _fmt(appointment.created_at),
        "archivos_resultado": files,
    }


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        # Only clinic staff may browse/manage appointments through this
        # viewset. Partner clinics use the read-only /api/partners/portal/
        # endpoints and patients use their own access flow.
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            return Appointment.objects.none()
        qs = Appointment.objects.select_related(
            "service", "report", "referring_partner"
        ).order_by("scheduled_at")
        date_param = self.request.query_params.get("date")
        if date_param == "today":
            qs = qs.filter(scheduled_at__date=localdate())
        elif date_param == "week":
            today = localdate()
            week_start = today - timedelta(days=today.weekday())
            qs = qs.filter(scheduled_at__date__gte=week_start)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        # IsAdminUser == is_staff; keeps partner/patient accounts from
        # listing, modifying, or deleting clinic data.
        return [permissions.IsAdminUser()]

    # ------------------------------------------------------------------
    # Auditing hooks
    # ------------------------------------------------------------------

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        filters = {
            k: v for k, v in request.query_params.items() if k in ("date", "status")
        }
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="appointment",
            description="Consultó el listado de citas",
            details={"filtros": filters, "resultados": len(response.data)},
        )
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="appointment",
            object_id=kwargs.get("pk", ""),
            description=f"Consultó la cita #{kwargs.get('pk', '')}",
        )
        return response

    def perform_create(self, serializer):
        appointment = serializer.save()
        log_action(
            self.request,
            AuditLog.Action.CREATE,
            object_type="appointment",
            object_id=appointment.id,
            description=(
                f"Creó la cita #{appointment.id} — {appointment.patient_name}"
                f" ({appointment.service.name})"
            ),
            details={"cita": _appointment_snapshot(appointment)},
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_values = {f: getattr(instance, f) for f in _APPOINTMENT_TRACKED_FIELDS}

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()

        changes = {}
        for field, old in old_values.items():
            new = getattr(instance, field)
            if new != old:
                changes[field] = {"antes": _fmt(old), "despues": _fmt(new)}

        if changes:
            if list(changes.keys()) == ["status"]:
                description = (
                    f"Cambió el estado de la cita #{instance.id}"
                    f" ({instance.patient_name}) de"
                    f" {changes['status']['antes']} a {changes['status']['despues']}"
                )
            else:
                description = f"Editó la cita #{instance.id} — {instance.patient_name}"
            log_action(
                request,
                AuditLog.Action.UPDATE,
                object_type="appointment",
                object_id=instance.id,
                description=description,
                details={"cambios": changes},
            )
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        appointment = self.get_object()
        snapshot = _appointment_snapshot(appointment)
        appointment.soft_delete(request.user)
        log_action(
            request,
            AuditLog.Action.DELETE,
            object_type="appointment",
            object_id=appointment.id,
            description=(
                f"Eliminó la cita #{appointment.id} — {appointment.patient_name}"
                f" ({snapshot.get('servicio') or 'sin servicio'},"
                f" {snapshot.get('fecha') or 'sin fecha'})"
            ),
            details={"cita_eliminada": snapshot},
        )
        return Response(status=204)


class PatientsListView(APIView):
    """Staff view of distinct patients (aggregated from appointments).

    DELETE removes a patient: since patients are derived from appointments,
    it soft-deletes every appointment (and with them, the visible results)
    registered under the given email.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)
        rows = (
            Appointment.objects
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
            object_type="patient",
            description="Consultó el listado de pacientes",
            details={"resultados": len(rows)},
        )
        return Response(rows)

    def delete(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        email = (request.query_params.get("email") or "").strip()
        if not email:
            return Response({"detail": "Falta el parámetro email."}, status=400)

        appointments = list(
            Appointment.objects.filter(patient_email__iexact=email).select_related(
                "service", "referring_partner"
            )
        )
        if not appointments:
            return Response({"detail": "Paciente no encontrado."}, status=404)

        patient_name = appointments[0].patient_name
        snapshots = [_appointment_snapshot(a) for a in appointments]
        for appointment in appointments:
            appointment.soft_delete(request.user)

        log_action(
            request,
            AuditLog.Action.DELETE,
            object_type="patient",
            object_id=email,
            description=(
                f"Eliminó al paciente {patient_name} ({email}) —"
                f" {len(appointments)} cita(s) y sus resultados"
            ),
            details={"paciente": patient_name, "correo": email, "citas_eliminadas": snapshots},
        )
        return Response({"deleted_appointments": len(appointments)})


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        today = timezone.localdate()
        now = timezone.localtime()

        today_appts = (
            Appointment.objects.filter(scheduled_at__date=today)
            .select_related("service")
            .order_by("scheduled_at")
        )
        total_today = today_appts.count()
        today_ids = list(today_appts.values_list("id", flat=True))

        pending_count = today_appts.filter(status=Appointment.Status.PENDING).count()

        in_progress = (
            today_appts.filter(status=Appointment.Status.IN_PROGRESS)
            .order_by("scheduled_at")
            .first()
        )
        next_appt = (
            today_appts.filter(
                status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
                scheduled_at__gt=now,
            )
            .order_by("scheduled_at")
            .first()
        )

        reports_emitted = Report.objects.filter(
            appointment_id__in=today_ids, emitted_at__isnull=False
        ).count()
        reports_uploaded = Report.objects.filter(
            appointment_id__in=today_ids, uploaded_at__isnull=False
        ).count()

        new_patients = PatientProfile.objects.filter(
            created_at__year=today.year, created_at__month=today.month
        ).count()

        # Weekly studies — Mon → today's weekday
        week_start = today - timedelta(days=today.weekday())
        day_labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        weekly_studies = []
        for i in range(today.weekday() + 1):
            d = week_start + timedelta(days=i)
            weekly_studies.append(
                {
                    "day": day_labels[i],
                    "count": Appointment.objects.filter(scheduled_at__date=d).count(),
                    "is_today": d == today,
                }
            )

        # Upload status rows (one per today's appointment)
        upload_status = []
        reports_map = {
            r.appointment_id: r
            for r in Report.objects.filter(appointment_id__in=today_ids)
        }
        for appt in today_appts:
            report = reports_map.get(appt.id)
            uploaded_at = report.uploaded_at if report else None
            upload_status.append(
                {
                    "appointment_id": appt.id,
                    "patient_name": appt.patient_name,
                    "uploaded_at": (
                        timezone.localtime(uploaded_at).strftime("%H:%M")
                        if uploaded_at
                        else None
                    ),
                }
            )

        def fmt_appt(appt):
            if not appt:
                return None
            return {
                "patient_name": appt.patient_name,
                "service_name": appt.service.name,
                "room": appt.room,
                "time": timezone.localtime(appt.scheduled_at).strftime("%I:%M %p"),
            }

        appointments_list = [
            {
                "id": a.id,
                "time": timezone.localtime(a.scheduled_at).strftime("%H:%M"),
                "patient_name": a.patient_name,
                "service_name": a.service.name,
                "room": a.room,
                "status": a.status,
            }
            for a in today_appts
        ]

        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="dashboard",
            description="Consultó el resumen del dashboard",
        )

        return Response(
            {
                "greeting_name": request.user.first_name or request.user.username,
                "stats": {
                    "appointments_today": total_today,
                    "appointments_pending": pending_count,
                    "new_patients_month": new_patients,
                    "reports_emitted": reports_emitted,
                    "reports_emitted_pending": total_today - reports_emitted,
                    "reports_uploaded": reports_uploaded,
                    "reports_uploaded_pending": total_today - reports_uploaded,
                },
                "current_appointment": fmt_appt(in_progress),
                "next_appointment": fmt_appt(next_appt),
                "todays_appointments": appointments_list,
                "weekly_studies": weekly_studies,
                "upload_status": upload_status,
            }
        )


class ReportUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, appointment_id):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        try:
            appointment = Appointment.objects.get(pk=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"detail": "Cita no encontrada."}, status=404)

        # Accept "files" (multiple) or legacy "file" (single)
        files = request.FILES.getlist("files") or (
            [request.FILES["file"]] if "file" in request.FILES else []
        )
        if not files:
            return Response({"detail": "No se proporcionó archivo."}, status=400)

        report, _ = Report.objects.get_or_create(appointment=appointment)

        created = []
        for f in files:
            rf = ReportFile.objects.create(
                report=report,
                file=f,
                original_name=f.name,
            )
            try:
                url = rf.file.url
            except Exception:
                url = None
            created.append(ReportFileSerializer(rf).data | {"url": url})

        report.uploaded_at = timezone.now()
        if not report.emitted_at:
            report.emitted_at = timezone.now()
        report.save(update_fields=["uploaded_at", "emitted_at"])

        log_action(
            request,
            AuditLog.Action.UPLOAD,
            object_type="report_file",
            object_id=appointment.id,
            description=(
                f"Subió {len(files)} archivo(s) de resultados a la cita"
                f" #{appointment.id} — {appointment.patient_name}"
            ),
            details={"archivos": [f.name for f in files]},
        )

        return Response({
            "uploaded_at": timezone.localtime(report.uploaded_at).strftime("%H:%M"),
            "files": created,
        })


class ReportFileDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, appointment_id, file_id):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        try:
            rf = ReportFile.objects.select_related("report").get(
                pk=file_id,
                report__appointment_id=appointment_id,
            )
        except ReportFile.DoesNotExist:
            return Response({"detail": "Archivo no encontrado."}, status=404)

        report = rf.report
        # Soft delete: the row (and the stored file) are kept, but the file
        # disappears from every view. The audit trail records what was removed.
        rf.soft_delete(request.user)

        if not report.files.exists():
            report.uploaded_at = None
            report.save(update_fields=["uploaded_at"])

        appointment = report.appointment
        log_action(
            request,
            AuditLog.Action.DELETE,
            object_type="report_file",
            object_id=rf.id,
            description=(
                f"Eliminó el archivo de resultados “{rf.original_name or rf.file.name}”"
                f" de la cita #{appointment.id} — {appointment.patient_name}"
            ),
            details={
                "archivo": rf.original_name or rf.file.name,
                "cita": appointment.id,
                "paciente": appointment.patient_name,
            },
        )
        return Response(status=204)
