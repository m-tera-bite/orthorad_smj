from django.contrib import admin
from django.urls import path, include, re_path
from apps.core.views import guide_view, partner_guide_view, spa_view
from apps.appointments.views import DashboardSummaryView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/partners/", include("apps.partners.urls")),
    path("api/portal/", include("apps.portal.urls.portal")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # Staff user guide (static HTML + images in backend/static/guia/)
    # Trailing slash optional: the SPA catch-all below would otherwise swallow "/guia".
    re_path(r"^guia/?$", guide_view, name="staff-guide"),
    re_path(r"^guia-socios/?$", partner_guide_view, name="partner-guide"),
    # Catch-all: serve the React SPA for any non-API route
    re_path(r"^(?!api/).*$", spa_view),
]
