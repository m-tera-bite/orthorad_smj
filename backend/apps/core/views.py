from django.http import FileResponse
from pathlib import Path
import os


def spa_view(request, *args, **kwargs):
    index_path = Path(__file__).resolve().parent.parent.parent / "static" / "react" / "index.html"
    return FileResponse(open(index_path, "rb"))
