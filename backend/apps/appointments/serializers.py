from rest_framework import serializers
from .models import Appointment, Report, ReportFile, Service, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "name"]


class ServiceSerializer(serializers.ModelSerializer):
    category = ServiceCategorySerializer(read_only=True)

    class Meta:
        model = Service
        fields = ["id", "name", "description", "duration_minutes", "category"]


class ReportFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        try:
            return obj.file.url if obj.file else None
        except Exception:
            return None

    class Meta:
        model = ReportFile
        fields = ["id", "original_name", "url", "uploaded_at"]


class ReportSerializer(serializers.ModelSerializer):
    files = ReportFileSerializer(many=True, read_only=True)

    class Meta:
        model = Report
        fields = ["id", "appointment", "files", "emitted_at", "uploaded_at", "created_at"]
        read_only_fields = ["emitted_at", "uploaded_at", "created_at"]


class AppointmentSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    report = serializers.SerializerMethodField()

    def get_report(self, obj):
        try:
            return ReportSerializer(obj.report).data
        except Report.DoesNotExist:
            return None

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
            "report",
        ]
        read_only_fields = ["status", "created_at"]
