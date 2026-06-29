from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, ServiceViewSet

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="service")
router.register("", AppointmentViewSet, basename="appointment")

urlpatterns = [path("", include(router.urls))]
