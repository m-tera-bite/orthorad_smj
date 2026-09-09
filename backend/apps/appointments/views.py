from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Max, Min
from django.utils import timezone
from django.utils.text import get_valid_filename
from django.utils.timezone import localdate
from google.cloud import storage as gcs_storage
from rest_framework import viewsets, permissions
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

import logging

from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.partners.models import Notification

from .emails import send_result_ready_emails
from .models import Appointment, Report, ReportFile, Service, generate_report_access_code
from .serializers import AppointmentSerializer, ReportFileSerializer, ReportSerializer, ServiceSerializer

logger = logging.getLogger(__name__)

# Fields tracked when diffing appointment edits for the audit trail.
_APPOINTMENT_TRACKED_FIELDS = [
    "patient_name",
    "patient_email",
    "patient_phone",
    "date_of_birth",
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
        "nacimiento": _fmt(appointment.date_of_birth),
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
        rows = Appointment.objects.values(
            "patient_name", "patient_email", "patient_phone"
        ).annotate(
            appointment_count=Count("id"),
            last_appointment=Max("scheduled_at"),
        )

        q = (request.query_params.get("q") or "").strip()
        if q:
            for word in q.split():
                rows = rows.filter(patient_name__icontains=word)
            rows = rows.annotate(date_of_birth=Max("date_of_birth"))
            rows = rows.order_by("patient_name")[:10]
        else:
            rows = rows.order_by("patient_name")

        rows = list(rows)
        log_action(
            request,
            AuditLog.Action.VIEW,
            object_type="patient",
            description="Consultó el listado de pacientes",
            details={"resultados": len(rows), "busqueda": q or None},
        )
        return Response(rows)

    def patch(self, request):
        """Edit a patient's contact info (email, phone) — applied across
        every appointment recorded under their current email, since patients
        have no identity of their own beyond the aggregated appointments."""
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        email = (request.query_params.get("email") or "").strip()
        if not email:
            return Response({"detail": "Falta el parámetro email."}, status=400)

        new_email = (request.data.get("patient_email") or "").strip()
        new_phone = (request.data.get("patient_phone") or "").strip()
        raw_dob = (request.data.get("date_of_birth") or "").strip()
        if not new_email:
            return Response({"detail": "El correo es obligatorio."}, status=400)
        try:
            validate_email(new_email)
        except DjangoValidationError:
            return Response({"detail": "Correo inválido."}, status=400)

        new_dob = None
        if raw_dob:
            try:
                new_dob = datetime.strptime(raw_dob, "%Y-%m-%d").date()
            except ValueError:
                return Response({"detail": "Fecha de nacimiento inválida."}, status=400)

        appointments = list(Appointment.objects.filter(patient_email__iexact=email))
        if not appointments:
            return Response({"detail": "Paciente no encontrado."}, status=404)

        patient_name = appointments[0].patient_name
        old_email = appointments[0].patient_email
        old_phone = appointments[0].patient_phone
        old_dob = appointments[0].date_of_birth

        Appointment.objects.filter(patient_email__iexact=email).update(
            patient_email=new_email, patient_phone=new_phone, date_of_birth=new_dob
        )

        log_action(
            request,
            AuditLog.Action.UPDATE,
            object_type="patient",
            object_id=new_email,
            description=f"Editó al paciente {patient_name} — datos de contacto actualizados",
            details={
                "paciente": patient_name,
                "antes": {"correo": old_email, "telefono": old_phone, "nacimiento": _fmt(old_dob)},
                "despues": {"correo": new_email, "telefono": new_phone, "nacimiento": _fmt(new_dob)},
                "citas_actualizadas": len(appointments),
            },
        )
        return Response(
            {
                "patient_name": patient_name,
                "patient_email": new_email,
                "patient_phone": new_phone,
                "date_of_birth": _fmt(new_dob),
                "appointment_count": len(appointments),
                "last_appointment": _fmt(max(a.scheduled_at for a in appointments)),
            }
        )

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

        # A patient is "new this month" if their earliest surviving
        # appointment (soft-deleted ones are excluded by the default
        # manager) was created this month — mirrors the patient list on the
        # Pacientes page, which is aggregated from Appointment the same way.
        new_patients = (
            Appointment.objects.values("patient_email")
            .annotate(first_seen=Min("created_at"))
            .filter(first_seen__year=today.year, first_seen__month=today.month)
            .count()
        )

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


def _finalize_report_file(rf, notify_patient, request):
    """Marks a ReportFile as stored and, if it's the first stored file for
    its report, sends the "results ready" notification. Shared by the GCS
    finalize step and the local-dev direct-upload fallback. Everything here
    is fast (a DB transaction plus, occasionally, one SMTP send) — no file
    bytes pass through this function or through Django at all in the GCS
    case, which is the whole point: nothing here can time out a request
    regardless of how large the underlying file is.

    Safe under concurrent calls for different files of the same report: the
    row lock below serializes the "is this the first stored file?" check so
    two files finishing around the same time can't both trigger the email.
    """
    rf.status = ReportFile.Status.STORED
    rf.save(update_fields=["file", "status"])

    with transaction.atomic():
        report = Report.objects.select_for_update().get(pk=rf.report_id)
        was_first_upload = report.uploaded_at is None
        report.uploaded_at = timezone.now()
        if not report.emitted_at:
            report.emitted_at = timezone.now()
        report.save(update_fields=["uploaded_at", "emitted_at"])

    appointment = report.appointment

    if was_first_upload:
        if appointment.referring_partner:
            Notification.objects.create(
                partner=appointment.referring_partner,
                appointment=appointment,
                message=(
                    f"Resultados de {appointment.patient_name} — "
                    f"{appointment.service.name} disponibles"
                ),
            )
        try:
            email_attempts = send_result_ready_emails(report, notify_patient=notify_patient)
        except Exception:
            logger.exception(
                "Failed to send result-ready email(s) for appointment %s", appointment.id
            )
            email_attempts = []

        for attempt in email_attempts:
            kind_label = "clínica" if attempt["kind"] == "partner" else "paciente"
            log_action(
                request,
                AuditLog.Action.EMAIL,
                object_type="report_email",
                object_id=appointment.id,
                description=(
                    f"{'Envió' if attempt['success'] else 'No se pudo enviar'} el correo de "
                    f"resultados a la {kind_label} ({attempt['to'] or 'sin correo registrado'})"
                    f" — cita #{appointment.id}, {appointment.patient_name}"
                ),
                details={
                    "destinatario": attempt["to"],
                    "tipo": attempt["kind"],
                    "exito": attempt["success"],
                    "error": attempt["error"],
                },
            )

    log_action(
        request,
        AuditLog.Action.UPLOAD,
        object_type="report_file",
        object_id=appointment.id,
        description=(
            f"Subió el archivo {rf.original_name} de resultados a la cita"
            f" #{appointment.id} — {appointment.patient_name}"
        ),
        details={"archivo": rf.original_name},
    )

    return rf


def _gcs_client():
    credentials = getattr(settings, "GS_CREDENTIALS", None)
    return gcs_storage.Client(
        credentials=credentials,
        project=getattr(credentials, "project_id", None),
    )


def _report_file_response(rf):
    try:
        url = rf.file.url if rf.file else None
    except Exception:
        url = None
    return ReportFileSerializer(rf).data | {"url": url}


class ReportUploadInitView(APIView):
    """Step 1 of uploading a result file: create (or reuse, on retry) a
    ReportFile row and hand back either a short-lived signed URL the browser
    can PUT the file to directly (GCS configured), or a small server URL to
    fall back to (local dev, no bucket configured). Django never sees the
    file's bytes in the GCS case — this request only ever carries a filename
    and a content type, so it can't time out or exhaust memory no matter how
    large the eventual file is."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, appointment_id):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        try:
            appointment = Appointment.objects.get(pk=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"detail": "Cita no encontrada."}, status=404)

        filename = (request.data.get("filename") or "").strip()
        if not filename:
            return Response({"detail": "Falta el nombre del archivo."}, status=400)
        content_type = request.data.get("content_type") or "application/octet-stream"
        existing_id = request.data.get("report_file_id")

        report, _ = Report.objects.get_or_create(appointment=appointment)
        if not report.access_code:
            report.access_code = generate_report_access_code()
            report.save(update_fields=["access_code"])

        rf = None
        if existing_id:
            rf = ReportFile.objects.filter(
                pk=existing_id, report=report, status=ReportFile.Status.PENDING
            ).first()
            if rf is not None:
                # Reissuing a URL for a retry — trust the row's own stored
                # name over whatever the client resent, so the storage path
                # we compute below stays stable across retries.
                filename = rf.original_name
        if rf is None:
            rf = ReportFile.objects.create(
                report=report, original_name=filename, status=ReportFile.Status.PENDING
            )

        if settings.GS_BUCKET_NAME:
            safe_name = get_valid_filename(filename)
            blob_path = f"reports/{appointment.id}/{rf.pk}_{safe_name}"
            rf.file.name = blob_path
            rf.save(update_fields=["file"])

            blob = _gcs_client().bucket(settings.GS_BUCKET_NAME).blob(blob_path)
            upload_url = blob.generate_signed_url(
                version="v4",
                method="PUT",
                expiration=timedelta(minutes=60),
                content_type=content_type,
            )
            return Response({
                "mode": "gcs",
                "report_file_id": rf.pk,
                "upload_url": upload_url,
                "headers": {"Content-Type": content_type},
            })

        return Response({
            "mode": "server",
            "report_file_id": rf.pk,
            "upload_url": f"/appointments/{appointment.id}/report/upload/{rf.pk}/direct/",
        })


class ReportUploadFinalizeView(APIView):
    """Step 2 for the GCS mode, called after the browser's direct PUT to
    the signed URL succeeds. Confirms the object actually landed (a cheap
    metadata check, not proportional to file size) and marks it stored."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, appointment_id, report_file_id):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        rf = ReportFile.objects.filter(
            pk=report_file_id, report__appointment_id=appointment_id
        ).first()
        if rf is None:
            return Response({"detail": "Archivo no encontrado."}, status=404)

        if rf.status == ReportFile.Status.STORED:
            return Response(_report_file_response(rf))  # idempotent retry

        # NOTE: deliberately not django-storages' `default_storage.exists()`
        # here — its GCS backend hard-codes exists() to always return False
        # whenever GS_FILE_OVERWRITE is left at its default of True (which it
        # is in this app), since that flag is meant to skip Django's
        # "generate a unique name" step during .save(), not to answer "does
        # this object exist". Check GCS directly instead, via the same
        # client/blob construction used to sign the upload URL.
        exists = False
        if rf.file:
            try:
                exists = _gcs_client().bucket(settings.GS_BUCKET_NAME).blob(rf.file.name).exists()
            except Exception:
                logger.exception(
                    "Error checking GCS for report file id=%s at %s", rf.pk, rf.file.name
                )

        if not exists:
            rf.status = ReportFile.Status.FAILED
            rf.save(update_fields=["status"])
            return Response(
                {"detail": "El archivo no se recibió correctamente. Intenta de nuevo."},
                status=400,
            )

        notify_patient = request.data.get("notify_patient") in ("true", "True", "1", True)
        _finalize_report_file(rf, notify_patient, request)
        return Response(_report_file_response(rf))


class ReportUploadDirectView(APIView):
    """Local-dev-only fallback, used only when GS_BUCKET_NAME isn't
    configured (mode: "server" from the init step above). Files in that
    situation are on local disk during development — small, no timeout or
    memory risk to design around — so a normal synchronous upload is fine."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, appointment_id, report_file_id):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=403)

        rf = ReportFile.objects.filter(
            pk=report_file_id, report__appointment_id=appointment_id
        ).first()
        if rf is None:
            return Response({"detail": "Archivo no encontrado."}, status=404)

        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "No se proporcionó archivo."}, status=400)

        rf.file.save(f.name, f, save=False)

        notify_patient = request.data.get("notify_patient") in ("true", "True", "1", True)
        _finalize_report_file(rf, notify_patient, request)
        return Response(_report_file_response(rf))


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
            # emitted_at is only ever set alongside uploaded_at (see
            # ReportUploadView), so once the last file is gone the report is
            # no longer "emitted" either — otherwise dashboard counts like
            # reports_emitted stay inflated after a delete.
            report.uploaded_at = None
            report.emitted_at = None
            report.save(update_fields=["uploaded_at", "emitted_at"])

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
