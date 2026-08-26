from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    actor_role_display = serializers.CharField(source="get_actor_role_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_email",
            "actor_role",
            "actor_role_display",
            "action",
            "action_display",
            "object_type",
            "object_id",
            "description",
            "details",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields
