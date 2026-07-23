from rest_framework import serializers
from .models import Appointment, Service, Report


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "description", "duration_minutes"]


class AppointmentSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient_name",
            "patient_email",
            "patient_phone",
            "service",
            "service_name",
            "scheduled_at",
            "notes",
            "room",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "appointment", "file", "emitted_at", "uploaded_at", "created_at"]
        read_only_fields = ["emitted_at", "uploaded_at", "created_at"]
