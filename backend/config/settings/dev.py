from .base import *
import dj_database_url
import os
from decouple import config
from datetime import timedelta

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1","orthorad-smj-prod-9ebfb0f7fb68.herokuapp.com"]

# Prints outgoing emails to the console instead of sending real mail, so
# local development never spams real clinics/patients. Override in .env
# with EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend to test
# real sends locally.
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")

DATABASES = {
    "default": dj_database_url.parse(config("SUPABASE_URI"))
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "https://orthorad-smj-prod-9ebfb0f7fb68.herokuapp.com",
]

CORS_ALLOW_CREDENTIALS = True

# Google Cloud Storage
# Set GCS_BUCKET_NAME once your bucket is created.
# Auth — two options, whichever is set wins:
#   GCS_CREDENTIALS_JSON  — full service-account JSON as a string (Heroku / any PaaS)
#   GOOGLE_APPLICATION_CREDENTIALS — path to a .json key file (local dev)
GS_BUCKET_NAME = config("GCS_BUCKET_NAME", default="")
if GS_BUCKET_NAME:
    STORAGES = {
        **STORAGES,
        "default": {
            "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        },
    }
    GS_DEFAULT_ACL = None          # use bucket-level IAM, not per-object ACLs
    GS_QUERYSTRING_AUTH = True     # generate signed URLs (bucket is private)
    GS_EXPIRATION = timedelta(hours=8)
    MEDIA_URL = f"https://storage.googleapis.com/{GS_BUCKET_NAME}/"

    _gcs_json = config("GCS_CREDENTIALS_JSON", default="")
    if _gcs_json:
        import json
        from google.oauth2 import service_account
        GS_CREDENTIALS = service_account.Credentials.from_service_account_info(
            json.loads(_gcs_json)
        )
    else:
        # decouple reads .env but doesn't push into os.environ — the Google SDK
        # needs GOOGLE_APPLICATION_CREDENTIALS in the real environment, so we set it here.
        _creds_path = config("GOOGLE_APPLICATION_CREDENTIALS", default="")
        if _creds_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _creds_path
else:
    # Fallback to local media while the bucket isn't configured yet
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
