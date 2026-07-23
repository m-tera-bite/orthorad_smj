import logging
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)
User = get_user_model()


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(url, cache_keys=True)


class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        try:
            client = _jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256", "HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError as e:
            logger.error("Supabase JWT verification failed: %s", e)
            raise AuthenticationFailed(f"Invalid token: {e}")
        except Exception as e:
            logger.error("Supabase JWT auth error: %s", e)
            raise AuthenticationFailed("Authentication error")

        email = payload.get("email", "")
        if not email:
            raise AuthenticationFailed("Token missing email claim")

        is_staff = bool(payload.get("app_metadata", {}).get("is_staff", False))
        user_meta = payload.get("user_metadata", {}) or {}

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": user_meta.get("first_name", ""),
                "last_name": user_meta.get("last_name", ""),
            },
        )
        if user.is_staff != is_staff:
            user.is_staff = is_staff
            user.save(update_fields=["is_staff"])

        return (user, token)

    def authenticate_header(self, request):
        return "Bearer"
