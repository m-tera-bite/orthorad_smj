from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PartnerAppointmentsView,
    PartnerMeView,
    PartnerPatientsView,
    PartnerViewSet,
)

router = DefaultRouter()
router.register("", PartnerViewSet, basename="partner")

urlpatterns = [
    # Explicit portal paths must come before the router so its wildcard
    # detail pattern (?P<pk>[^/.]+)/ doesn't swallow them.
    path("portal/me/", PartnerMeView.as_view(), name="partner-portal-me"),
    path("portal/patients/", PartnerPatientsView.as_view(), name="partner-portal-patients"),
    path("portal/appointments/", PartnerAppointmentsView.as_view(), name="partner-portal-appointments"),
    path("", include(router.urls)),
]
