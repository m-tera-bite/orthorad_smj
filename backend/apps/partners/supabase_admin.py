"""Minimal Supabase Admin API client (no extra dependencies).

Used to provision the email/password login for partner-clinic users so
staff can hand credentials over directly. Requires the service-role key
(SUPABASE_SERVICE_ROLE_KEY in .env) — if it's not configured we skip the
call and the account must be created manually in the Supabase dashboard.
"""
import json
import logging
import urllib.error
import urllib.parse
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


# ---------------------------------------------------------------------------
# Password reset helpers
# ---------------------------------------------------------------------------

NO_KEY_MESSAGE = (
    "SUPABASE_SERVICE_ROLE_KEY no está configurada: no se puede gestionar la "
    "cuenta desde aquí. Hazlo desde el panel de Supabase."
)


def _call(method: str, path: str, payload=None, query: str = ""):
    """Call the Supabase Auth API with the service-role key.

    Returns (status_code, parsed_json_or_None). status_code is None when
    Supabase could not be reached. Never raises.
    """
    service_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    url = f"{settings.SUPABASE_URL}/auth/v1{path}{query}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode() or "{}"
            try:
                return resp.status, json.loads(raw)
            except ValueError:
                return resp.status, None
    except urllib.error.HTTPError as e:
        raw = ""
        try:
            raw = e.read().decode()
        except Exception:
            pass
        try:
            body = json.loads(raw)
        except ValueError:
            body = None
        logger.warning("Supabase auth %s %s failed (%s): %s", method, path, e.code, raw)
        return e.code, body
    except Exception as e:
        logger.error("Supabase auth %s %s error: %s", method, path, e)
        return None, None


def find_supabase_user_id(email: str):
    """Look up a Supabase user id by email without sending any email.

    Pages through the admin user list (there is no lookup-by-email endpoint).
    Do NOT use admin generate_link for this: it counts as a recovery request
    and trips Supabase's per-user email cooldown for the send that follows.

    Returns (user_id | None, state) where state is one of
    "found", "missing", "no_key", "error".
    """
    if not getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", ""):
        return None, "no_key"
    wanted = email.strip().lower()
    per_page = 200
    for page in range(1, 51):  # up to 10,000 users
        status, body = _call("GET", "/admin/users", query=f"?page={page}&per_page={per_page}")
        if status is None or not (200 <= status < 300) or body is None:
            return None, "error"
        users = body.get("users", [])
        for u in users:
            if (u.get("email") or "").strip().lower() == wanted:
                return u.get("id"), "found"
        if len(users) < per_page:
            return None, "missing"
    return None, "error"


def send_recovery_email(email: str, redirect_to: str):
    """Ask Supabase to email a password-recovery link. Returns (ok, message)."""
    if not getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", ""):
        return False, NO_KEY_MESSAGE
    status, body = _call(
        "POST",
        "/recover",
        {"email": email},
        query="?redirect_to=" + urllib.parse.quote(redirect_to, safe=""),
    )
    if status is None:
        return False, "No se pudo contactar a Supabase. Intenta de nuevo."
    if 200 <= status < 300:
        return True, "Enviamos el enlace de restablecimiento al correo del usuario."
    if status == 429 or (body or {}).get("error_code") == "over_email_send_rate_limit":
        return False, "Se envió un correo hace poco. Espera un minuto e intenta de nuevo."
    return False, f"Supabase rechazó el envío ({status}). Revisa la configuración de correo."


def set_supabase_password(user_id: str, password: str):
    """Set a user's password through the admin API. Returns (ok, message)."""
    if not getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", ""):
        return False, NO_KEY_MESSAGE
    status, _ = _call("PUT", f"/admin/users/{user_id}", {"password": password})
    if status is not None and 200 <= status < 300:
        return True, "Contraseña actualizada."
    if status is None:
        return False, "No se pudo contactar a Supabase. Intenta de nuevo."
    return False, f"Supabase rechazó el cambio de contraseña ({status})."
