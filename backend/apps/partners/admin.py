from django.contrib import admin

from .models import Partner, PartnerUser


class PartnerUserInline(admin.TabularInline):
    model = PartnerUser
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_name", "email", "phone", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "contact_name", "email"]
    inlines = [PartnerUserInline]


@admin.register(PartnerUser)
class PartnerUserAdmin(admin.ModelAdmin):
    list_display = ["user", "partner", "created_at"]
    search_fields = ["user__email", "partner__name"]
    autocomplete_fields = ["user", "partner"]
