from datetime import timedelta

from django.db.models import Count, Max
from django.utils import timezone
from django.utils.timezone import localdate
from rest_framework import viewsets, permissions
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.portal.models import PatientProfile

from .models import Appointment, Report, ReportFile, Service
from .serializers import AppointmentSerializer, ReportFileSerializer, ReportSerializer, ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Appointment.objects.none()
        qs = Appointment.objects.select_related("service", "report").order_by("scheduled_at")
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
        return [permissions.IsAuthenticated()]


class PatientsListView(APIView):
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
        return Response(list(rows))


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
        try:
            rf.file.delete(save=False)
        except Exception:
            pass
        rf.delete()

        if not report.files.exists():
            report.uploaded_at = None
            report.save(update_fields=["uploaded_at"])

        return Response(status=204)
