from django.db import models
from django.contrib.auth.models import User


class Partner(models.Model):
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
