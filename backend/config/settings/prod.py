from .base import *
import dj_database_url
from decouple import config
from datetime import timedelta

DEBUG = False
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

# When set, any request whose Host header doesn't match this gets a 301
# to it (see apps.core.middleware.CanonicalHostRedirectMiddleware) — used
# to send the raw herokuapp.com hostname to the branded domain.
CANONICAL_HOST = config("CANONICAL_HOST", default="")

# Heroku's router terminates TLS and forwards plain HTTP to the dyno;
# without this, request.is_secure() is always False, which breaks CSRF
# checks (e.g. /admin login) and cookie security below.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

DATABASES = {
    "default": dj_database_url.config(env="DATABASE_URL")
}

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="").split(",")

GS_BUCKET_NAME = config("GCS_BUCKET_NAME", default="")
if GS_BUCKET_NAME:
    STORAGES = {
        **STORAGES,
        "default": {
            "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        },
    }
    GS_DEFAULT_ACL = None
    GS_QUERYSTRING_AUTH = True
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
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
