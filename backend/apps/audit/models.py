from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Immutable trail of actions taken through the API.

    One row per action: who did it, what they did, which object it touched
    and — for destructive actions — a JSON snapshot of the data at the time,
    so deleted information can always be reviewed (and manually restored).
    Rows are only ever inserted, never updated or deleted from the app.
    """

    class Action(models.TextChoices):
        VIEW = "view", "Consulta"
        CREATE = "create", "Creación"
        UPDATE = "update", "Edición"
        DELETE = "delete", "Eliminación"
        UPLOAD = "upload", "Carga de archivo"
        EMAIL = "email", "Correo"

    class Role(models.TextChoices):
        STAFF = "staff", "Personal"
        PARTNER = "partner", "Clínica asociada"
        PATIENT = "patient", "Paciente"
        PUBLIC = "public", "Público"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    # Snapshotted so the trail stays readable even if the user is removed.
    actor_email = models.CharField(max_length=254, blank=True)
    actor_role = models.CharField(max_length=10, choices=Role.choices, default=Role.PUBLIC)
    action = models.CharField(max_length=10, choices=Action.choices)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=500, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor_email or 'público'} — {self.get_action_display()} {self.object_type} {self.object_id}"
