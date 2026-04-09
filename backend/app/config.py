from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv


_BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BASE_DIR / ".env")


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_proxy_urls(raw: str) -> list[str]:
    """Parse a comma-separated list of proxy URLs.

    Accepts two formats per entry:
      - Standard URL:  http://user:pass@ip:port
      - Compact:       ip:port:user:pass

    Returns a list of ``http://user:pass@ip:port`` strings.
    """
    urls: list[str] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if entry.startswith("http://") or entry.startswith("https://"):
            urls.append(entry)
        else:
            # Compact format: ip:port:user:pass
            parts = entry.split(":")
            if len(parts) == 4:
                ip, port, user, passwd = parts
                urls.append(f"http://{user}:{passwd}@{ip}:{port}")
            else:
                # Best-effort: treat as-is
                urls.append(f"http://{entry}")
    return urls


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    cors_origins: list[str]
    map_cache_ttl_seconds: int
    player_cache_ttl_seconds: int
    player_cache_redis_url: str | None
    request_timeout_seconds: float
    timezone: str
    bootstrap_browser: bool
    debug: bool
    cf_clearance: str | None
    php_sessid: str | None
    kog_proxy_urls: list[str]
    frontend_base_url: str
    auth_redirect_base_url: str | None
    auth_secret_key: str
    auth_session_ttl_seconds: int
    auth_cookie_secure: bool
    auth_db_path: str
    google_client_id: str | None
    google_client_secret: str | None
    discord_client_id: str | None
    discord_client_secret: str | None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    cors_origins = _parse_csv(os.getenv("CORS_ORIGINS"))
    if not cors_origins:
        cors_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    return Settings(
        app_name=os.getenv("APP_NAME", "KoG Team Planner API"),
        app_env=os.getenv("APP_ENV", "development"),
        cors_origins=cors_origins,
        map_cache_ttl_seconds=int(os.getenv("MAP_CACHE_TTL_SECONDS", "21600")),
        player_cache_ttl_seconds=int(os.getenv("PLAYER_CACHE_TTL_SECONDS", "1800")),
        player_cache_redis_url=(
            os.getenv("PLAYER_CACHE_REDIS_URL") or os.getenv("REDIS_URL")
        ),
        request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "30")),
        timezone=os.getenv("KOG_TIMEZONE", "UTC"),
        bootstrap_browser=_parse_bool(os.getenv("KOG_BOOTSTRAP_BROWSER"), False),
        debug=_parse_bool(os.getenv("DEBUG"), False),
        cf_clearance=os.getenv("KOG_CF_CLEARANCE"),
        php_sessid=os.getenv("KOG_PHPSESSID"),
        kog_proxy_urls=_parse_proxy_urls(
            os.getenv("KOG_PROXY_URLS") or os.getenv("KOG_PROXY_URL") or ""
        ),
        frontend_base_url=os.getenv(
            "FRONTEND_BASE_URL", "http://127.0.0.1:5173"
        ).rstrip("/"),
        auth_redirect_base_url=(os.getenv("AUTH_REDIRECT_BASE_URL") or "").rstrip("/")
        or None,
        auth_secret_key=os.getenv(
            "AUTH_SECRET_KEY", "dev-insecure-auth-secret-change-me"
        ),
        auth_session_ttl_seconds=int(os.getenv("AUTH_SESSION_TTL_SECONDS", "2592000")),
        auth_cookie_secure=_parse_bool(os.getenv("AUTH_COOKIE_SECURE"), False),
        auth_db_path=os.getenv("AUTH_DB_PATH", str(_BASE_DIR / "data" / "auth.db")),
        google_client_id=(os.getenv("GOOGLE_CLIENT_ID") or "").strip() or None,
        google_client_secret=(os.getenv("GOOGLE_CLIENT_SECRET") or "").strip() or None,
        discord_client_id=(os.getenv("DISCORD_CLIENT_ID") or "").strip() or None,
        discord_client_secret=(os.getenv("DISCORD_CLIENT_SECRET") or "").strip()
        or None,
    )
