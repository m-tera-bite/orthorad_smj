from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_email", "actor_role", "action", "object_type", "object_id", "description")
    list_filter = ("action", "actor_role", "object_type")
    search_fields = ("actor_email", "description", "object_id")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    # The trail is immutable from the admin as well.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
