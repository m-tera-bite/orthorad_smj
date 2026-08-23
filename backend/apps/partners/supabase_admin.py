"""Minimal Supabase Admin API client (no extra dependencies).

Used to provision the email/password login for partner-clinic users so
staff can hand credentials over directly. Requires the service-role key
(SUPABASE_SERVICE_ROLE_KEY in .env) — if it's not configured we skip the
call and the account must be created manually in the Supabase dashboard.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def create_supabase_user(email: str, password: str):
    """Create a confirmed email/password user in Supabase Auth.

    Returns (created: bool, message: str). Never raises.
    """
    service_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    if not service_key:
        return False, (
            "SUPABASE_SERVICE_ROLE_KEY no está configurada: crea la cuenta "
            "manualmente en el panel de Supabase con este correo."
        )

    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    payload = json.dumps(
        {"email": email, "password": password, "email_confirm": True}
    ).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if 200 <= resp.status < 300:
                return True, "Cuenta creada en Supabase."
            return False, f"Supabase respondió {resp.status}."
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
        except Exception:
            pass
        if e.code == 422 or "already" in body.lower():
            return False, "Este correo ya tiene una cuenta en Supabase; se usará esa cuenta."
        logger.error("Supabase admin user creation failed (%s): %s", e.code, body)
        return False, f"Supabase rechazó la creación ({e.code})."
    except Exception as e:
        logger.error("Supabase admin user creation error: %s", e)
        return False, "No se pudo contactar a Supabase; crea la cuenta manualmente."
