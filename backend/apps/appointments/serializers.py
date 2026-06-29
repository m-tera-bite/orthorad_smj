from rest_framework import serializers
from .models import Appointment, Service


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
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]
