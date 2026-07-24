from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, PatientsListView, ReportFileDeleteView, ReportUploadView, ServiceViewSet

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="service")
router.register("", AppointmentViewSet, basename="appointment")

urlpatterns = [
    # Explicit paths must come before the router so the router's wildcard
    # detail pattern (?P<pk>[^/.]+)/ doesn't swallow them.
    path("patients/", PatientsListView.as_view(), name="patients-list"),
    path("<int:appointment_id>/report/upload/", ReportUploadView.as_view(), name="report-upload"),
    path("<int:appointment_id>/report/files/<int:file_id>/", ReportFileDeleteView.as_view(), name="report-file-delete"),
    path("", include(router.urls)),
]
