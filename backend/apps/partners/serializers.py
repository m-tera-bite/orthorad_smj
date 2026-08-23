from rest_framework import serializers

from apps.appointments.models import Appointment
from apps.appointments.serializers import ReportSerializer

from .models import Partner, PartnerUser


class PartnerUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = PartnerUser
        fields = ["id", "user_id", "email", "created_at"]


class PartnerSerializer(serializers.ModelSerializer):
    users_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Partner
        fields = [
            "id",
            "name",
            "contact_name",
            "email",
            "phone",
            "is_active",
            "users_count",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PartnerAppointmentSerializer(serializers.ModelSerializer):
    """Read-only view of an appointment for the referring partner clinic."""

    service_name = serializers.CharField(source="service.name", read_only=True)
    report = serializers.SerializerMethodField()

    def get_report(self, obj):
        report = getattr(obj, "report", None)
        if report is None:
            return None
        return ReportSerializer(report, context=self.context).data

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient_name",
            "patient_email",
            "patient_phone",
            "service_name",
            "scheduled_at",
            "status",
            "report",
        ]
        read_only_fields = fields
