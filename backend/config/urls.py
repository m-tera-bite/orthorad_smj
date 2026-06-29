from django.contrib import admin
from django.urls import path, include, re_path
from apps.core.views import spa_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.portal.urls.auth")),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/portal/", include("apps.portal.urls.portal")),
    # Catch-all: serve the React SPA for any non-API route
    re_path(r"^(?!api/).*$", spa_view),
]
