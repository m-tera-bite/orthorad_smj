from django.contrib import admin
from .models import Appointment, Service, Report


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "duration_minutes", "is_active"]
    list_filter = ["is_active"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient_name", "service", "scheduled_at", "room", "status", "created_at"]
    list_filter = ["status", "service"]
    search_fields = ["patient_name", "patient_email", "patient_phone"]
    date_hierarchy = "scheduled_at"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["appointment", "emitted_at", "uploaded_at", "created_at"]
    list_filter = ["emitted_at", "uploaded_at"]
    search_fields = ["appointment__patient_name"]
    raw_id_fields = ["appointment"]
