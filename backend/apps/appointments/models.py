import secrets

from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel


def _report_file_path(instance, filename):
    return f"reports/{instance.report.appointment_id}/{filename}"


def generate_report_access_code():
    """A short 'expedition code' (e.g. ORTHORAD-2026-0987) a patient can use,
    together with their date of birth, to look up one specific result on the
    public portal. Not meant to be cryptographically strong on its own — the
    guest lookup endpoint is rate-limited, which is the real control here."""
    year = timezone.localdate().year
    for _ in range(10):
        candidate = f"ORTHORAD-{year}-{secrets.randbelow(10000):04d}"
        if not Report.objects.filter(access_code=candidate).exists():
            return candidate
    raise RuntimeError("No se pudo generar un código de acceso único.")


class ServiceCategory(models.Model):
    name = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class Service(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(
        ServiceCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="services",
    )

    def __str__(self):
        return self.name


class Appointment(SoftDeleteModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONFIRMED = "confirmed", "Confirmado"
        IN_PROGRESS = "in_progress", "En Curso"
        COMPLETED = "completed", "Completado"
        CANCELLED = "cancelled", "Cancelado"

    patient_name = models.CharField(max_length=200)
    patient_email = models.EmailField(blank=True)
    patient_phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="appointments")
    referring_partner = models.ForeignKey(
        "partners.Partner",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appointments",
        help_text="Clínica asociada que refirió al paciente; da acceso de solo lectura a los resultados.",
    )
    scheduled_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    room = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at"]
        base_manager_name = "all_objects"

    def __str__(self):
        return f"{self.patient_name} — {self.service.name} @ {self.scheduled_at:%Y-%m-%d %H:%M}"


class Report(models.Model):
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="report"
    )
    emitted_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    access_code = models.CharField(max_length=32, null=True, blank=True, unique=True)

    def __str__(self):
        return f"Reporte — {self.appointment}"


class ReportFile(SoftDeleteModel):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="files")
    file = models.FileField(upload_to=_report_file_path)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        base_manager_name = "all_objects"

    def __str__(self):
        return self.original_name or self.file.name
