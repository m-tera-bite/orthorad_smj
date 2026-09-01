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
    referring_partner_name = serializers.CharField(
        source="referring_partner.name", read_only=True, default=None
    )
    report = serializers.SerializerMethodField()
    report_access_code = serializers.SerializerMethodField()

    def get_report(self, obj):
        try:
            return ReportSerializer(obj.report).data
        except Report.DoesNotExist:
            return None

    def get_report_access_code(self, obj):
        # Staff-only, even though this serializer is also used by the public
        # (AllowAny) booking endpoint — never expose a patient's access code
        # to an unauthenticated request.
        request = self.context.get("request")
        if not (request and request.user.is_authenticated and request.user.is_staff):
            return None
        report = getattr(obj, "report", None)
        return report.access_code if report else None

    def validate_status(self, value):
        """Only clinic staff may set or change the status (public booking
        always starts as 'pending')."""
        request = self.context.get("request")
        if (
            request is None
            or not request.user.is_authenticated
            or not request.user.is_staff
        ):
            raise serializers.ValidationError(
                "Solo el personal puede cambiar el estado de una cita."
            )
        return value

    def validate_referring_partner(self, value):
        """Only clinic staff may attach a referring partner (public booking
        must not be able to tag appointments onto a partner clinic)."""
        request = self.context.get("request")
        if value is not None and (
            request is None
            or not request.user.is_authenticated
            or not request.user.is_staff
        ):
            raise serializers.ValidationError(
                "Solo el personal puede asignar una clínica referente."
            )
        return value

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient_name",
            "patient_email",
            "patient_phone",
            "date_of_birth",
            "service",
            "service_name",
            "referring_partner",
            "referring_partner_name",
            "scheduled_at",
            "notes",
            "room",
            "status",
            "created_at",
            "report",
            "report_access_code",
        ]
        read_only_fields = ["created_at"]
