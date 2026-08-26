from django.utils.dateparse import parse_date
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

from apps.partners.permissions import IsStaff

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    max_page_size = 200
    page_size_query_param = "page_size"


class AuditLogListView(ListAPIView):
    """Staff-only, read-only audit trail with filters.

    Query params:
      action        — exact action (view/create/update/delete/upload)
      exclude_views — "1" hides read (view) entries
      object_type   — exact object type (appointment/patient/partner/...)
      actor         — substring match on the actor's email
      q             — substring match on the description
      date_from     — ISO date (inclusive)
      date_to       — ISO date (inclusive)
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsStaff]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        qs = AuditLog.objects.all()
        params = self.request.query_params

        action = params.get("action")
        if action:
            qs = qs.filter(action=action)
        elif params.get("exclude_views") == "1":
            qs = qs.exclude(action=AuditLog.Action.VIEW)

        object_type = params.get("object_type")
        if object_type:
            qs = qs.filter(object_type=object_type)

        actor = params.get("actor")
        if actor:
            qs = qs.filter(actor_email__icontains=actor)

        q = params.get("q")
        if q:
            qs = qs.filter(description__icontains=q)

        date_from = parse_date(params.get("date_from") or "")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = parse_date(params.get("date_to") or "")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs
