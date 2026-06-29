from .base import *
import dj_database_url
from decouple import config

DEBUG = False
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

DATABASES = {
    "default": dj_database_url.config(env="DATABASE_URL")
}

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="").split(",")
