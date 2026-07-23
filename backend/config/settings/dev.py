from .base import *
import dj_database_url
from decouple import config

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": dj_database_url.parse(config("SUPABASE_URI"))
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# Google Cloud Storage
# Set GCS_BUCKET_NAME once your bucket is created.
# Auth — two options, whichever is set wins:
#   GCS_CREDENTIALS_JSON  — full service-account JSON as a string (Heroku / any PaaS)
#   GOOGLE_APPLICATION_CREDENTIALS — path to a .json key file (local dev)
GS_BUCKET_NAME = config("GCS_BUCKET_NAME", default="")
if GS_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = "storages.backends.gcs.GoogleCloudStorage"
    GS_DEFAULT_ACL = None        # use bucket-level IAM, not per-object ACLs
    GS_QUERYSTRING_AUTH = False  # public bucket → plain URLs, no signing needed
    MEDIA_URL = f"https://storage.googleapis.com/{GS_BUCKET_NAME}/"

    _gcs_json = config("GCS_CREDENTIALS_JSON", default="")
    if _gcs_json:
        import json
        from google.oauth2 import service_account
        GS_CREDENTIALS = service_account.Credentials.from_service_account_info(
            json.loads(_gcs_json)
        )
    # If GCS_CREDENTIALS_JSON is absent, the Google SDK falls back to
    # GOOGLE_APPLICATION_CREDENTIALS (file path) automatically — no extra code needed.
else:
    # Fallback to local media while the bucket isn't configured yet
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
