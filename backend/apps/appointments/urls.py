from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, ReportUploadView, ServiceViewSet

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="service")
router.register("", AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("", include(router.urls)),
    path("<int:appointment_id>/report/upload/", ReportUploadView.as_view(), name="report-upload"),
]
