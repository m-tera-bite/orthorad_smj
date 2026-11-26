from django.http import FileResponse
from pathlib import Path


def _static_guide(folder):
    index_path = Path(__file__).resolve().parent.parent.parent / "static" / folder / "index.html"
    response = FileResponse(open(index_path, "rb"), content_type="text/html; charset=utf-8")
    response["Cache-Control"] = "no-cache, must-revalidate"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


def guide_view(request):
    """Staff user guide: a static page kept in backend/static/guia/."""
    return _static_guide("guia")


def partner_guide_view(request):
    """Partner-clinic user guide: a static page kept in backend/static/guia-socios/."""
    return _static_guide("guia-socios")


def spa_view(request, *args, **kwargs):
    index_path = Path(__file__).resolve().parent.parent.parent / "static" / "react" / "index.html"
    response = FileResponse(open(index_path, "rb"))
    response["Cache-Control"] = "no-cache, must-revalidate"
    return response
