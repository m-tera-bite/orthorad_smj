from django.db import models
from django.contrib.auth.models import User

from apps.core.models import SoftDeleteModel


class Partner(SoftDeleteModel):
    """A partner clinic that refers patients and gets read-only access
    to the results of the appointments it referred."""

    name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        base_manager_name = "all_objects"

    def __str__(self):
        return self.name


class PartnerUser(models.Model):
    """Links a Django auth user (matched by email at Supabase login)
    to the partner clinic whose data they may read."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="partner_link")
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name="users")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} → {self.partner.name}"


class Notification(models.Model):
    """One row per 'a referred patient's results are ready' event, shown as
    the red bell indicator in the partner portal."""

    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name="notifications")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.CASCADE, related_name="+"
    )
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.partner.name} — {self.message}"
