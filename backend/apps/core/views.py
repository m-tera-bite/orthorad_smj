from django.http import FileResponse
from pathlib import Path


def spa_view(request, *args, **kwargs):
    index_path = Path(__file__).resolve().parent.parent.parent / "static" / "react" / "index.html"
    response = FileResponse(open(index_path, "rb"))
    response["Cache-Control"] = "no-cache, must-revalidate"
    return response
