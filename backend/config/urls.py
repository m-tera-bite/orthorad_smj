from django.contrib import admin
from django.urls import path, include, re_path
from apps.core.views import spa_view
from apps.appointments.views import DashboardSummaryView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/partners/", include("apps.partners.urls")),
    path("api/portal/", include("apps.portal.urls.portal")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # Catch-all: serve the React SPA for any non-API route
    re_path(r"^(?!api/).*$", spa_view),
]
