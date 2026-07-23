from django.db import models


class Service(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONFIRMED = "confirmed", "Confirmado"
        IN_PROGRESS = "in_progress", "En Curso"
        COMPLETED = "completed", "Completado"
        CANCELLED = "cancelled", "Cancelado"

    patient_name = models.CharField(max_length=200)
    patient_email = models.EmailField()
    patient_phone = models.CharField(max_length=20)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="appointments")
    scheduled_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    room = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"{self.patient_name} — {self.service.name} @ {self.scheduled_at:%Y-%m-%d %H:%M}"


class Report(models.Model):
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="report"
    )
    file = models.FileField(upload_to="reports/", blank=True, null=True)
    emitted_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reporte — {self.appointment}"
