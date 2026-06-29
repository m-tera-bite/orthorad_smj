from django.contrib import admin
from .models import Appointment, Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "duration_minutes", "is_active"]
    list_filter = ["is_active"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient_name", "service", "scheduled_at", "status", "created_at"]
    list_filter = ["status", "service"]
    search_fields = ["patient_name", "patient_email", "patient_phone"]
    date_hierarchy = "scheduled_at"
