from django.urls import path
from apps.portal.views import MeView, PortalReportLookupView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("resultados/buscar/", PortalReportLookupView.as_view(), name="portal-report-lookup"),
]
