from __future__ import annotations

import base64
from dataclasses import dataclass
import hashlib
import hmac
import json
import secrets
import time
from typing import Any
from urllib.parse import urlencode, urlparse

import requests
from fastapi import Request

from app.config import Settings
from app.services.auth_store import AuthStore, AuthUser


class AuthError(ValueError):
    pass


@dataclass(frozen=True)
class OAuthProvider:
    key: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str


class AuthService:
    def __init__(self, settings: Settings, store: AuthStore) -> None:
        self.settings = settings
        self.store = store
        self.timeout = min(30.0, max(5.0, settings.request_timeout_seconds))
        self._secret = settings.auth_secret_key.encode("utf-8")

        self._providers: dict[str, OAuthProvider] = {
            "google": OAuthProvider(
                key="google",
                authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
                token_url="https://oauth2.googleapis.com/token",
                userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
                scope="openid email profile",
            ),
            "discord": OAuthProvider(
                key="discord",
                authorize_url="https://discord.com/oauth2/authorize",
                token_url="https://discord.com/api/oauth2/token",
                userinfo_url="https://discord.com/api/users/@me",
                scope="identify email",
            ),
        }

    def enabled_providers(self) -> list[str]:
        enabled: list[str] = []
        for key in self._providers:
            if (
                self._provider_credentials(key)[0]
                and self._provider_credentials(key)[1]
            ):
                enabled.append(key)
        return enabled

    def is_provider_enabled(self, provider: str) -> bool:
        client_id, client_secret = self._provider_credentials(provider)
        return bool(client_id and client_secret)

    def start_login(
        self,
        *,
        provider: str,
        request: Request,
        next_url: str | None,
    ) -> tuple[str, str]:
        provider_config = self._providers.get(provider)
        if provider_config is None:
            raise AuthError(f"Unsupported auth provider '{provider}'")

        client_id, _ = self._provider_credentials(provider)
        if not client_id:
            raise AuthError(f"Provider '{provider}' is not configured")

        state = secrets.token_urlsafe(24)
        safe_next = self._sanitize_next_url(next_url)

        state_token = self._encode_signed_payload(
            {
                "provider": provider,
                "state": state,
                "next": safe_next,
                "exp": int(time.time()) + 600,
            }
        )

        callback_url = self._callback_url(provider=provider, request=request)
        params: dict[str, str] = {
            "client_id": client_id,
            "redirect_uri": callback_url,
            "response_type": "code",
            "scope": provider_config.scope,
            "state": state,
        }
        if provider == "google":
            params["prompt"] = "select_account"

        authorize_url = f"{provider_config.authorize_url}?{urlencode(params)}"
        return authorize_url, state_token

    def finish_login(
        self,
        *,
        provider: str,
        request: Request,
        code: str,
        state: str,
        state_token: str | None,
    ) -> tuple[AuthUser, str, str]:
        payload = self._decode_signed_payload(state_token)
        if payload is None:
            raise AuthError("Missing or invalid OAuth state")

        expected_provider = payload.get("provider")
        expected_state = payload.get("state")
        if expected_provider != provider or expected_state != state:
            raise AuthError("OAuth state mismatch")

        access_token = self._exchange_code(
            provider=provider,
            request=request,
            code=code,
        )
        profile = self._fetch_user_profile(provider=provider, access_token=access_token)

        user = self.store.upsert_oauth_user(
            provider=provider,
            provider_user_id=profile["provider_user_id"],
            email=profile.get("email"),
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
        )

        session_token = self._encode_signed_payload(
            {
                "uid": user.id,
                "exp": int(time.time())
                + max(3600, self.settings.auth_session_ttl_seconds),
            }
        )
        next_url = self._sanitize_next_url(
            payload.get("next") if isinstance(payload.get("next"), str) else None
        )
        return user, session_token, next_url

    def get_user_from_session(self, session_token: str | None) -> AuthUser | None:
        payload = self._decode_signed_payload(session_token)
        if payload is None:
            return None

        user_id = payload.get("uid")
        if not isinstance(user_id, int):
            return None

        return self.store.get_user(user_id)

    def update_kog_name(self, *, user_id: int, kog_name: str) -> AuthUser:
        normalized = kog_name.strip()
        if len(normalized) < 2:
            raise AuthError("KoG name must be at least 2 characters")
        if len(normalized) > 64:
            raise AuthError("KoG name must be 64 characters or fewer")

        user = self.store.update_kog_name(user_id, normalized)
        if user is None:
            raise AuthError("User account no longer exists")

        return user

    def _exchange_code(self, *, provider: str, request: Request, code: str) -> str:
        provider_config = self._providers.get(provider)
        if provider_config is None:
            raise AuthError("Unsupported OAuth provider")

        client_id, client_secret = self._provider_credentials(provider)
        if not client_id or not client_secret:
            raise AuthError(f"Provider '{provider}' is not configured")

        callback_url = self._callback_url(provider=provider, request=request)
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": callback_url,
        }

        headers = {"Accept": "application/json"}
        if provider == "discord":
            headers["Content-Type"] = "application/x-www-form-urlencoded"

        try:
            response = requests.post(
                provider_config.token_url,
                data=payload,
                headers=headers,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise AuthError(f"Could not exchange OAuth code: {exc}") from exc

        if response.status_code >= 400:
            raise AuthError(
                f"OAuth token exchange failed ({provider}): {response.text[:200]}"
            )

        data = response.json()
        access_token = data.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise AuthError(f"OAuth token response missing access token ({provider})")
        return access_token

    def _fetch_user_profile(
        self, *, provider: str, access_token: str
    ) -> dict[str, str | None]:
        provider_config = self._providers.get(provider)
        if provider_config is None:
            raise AuthError("Unsupported OAuth provider")

        try:
            response = requests.get(
                provider_config.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise AuthError(f"Could not fetch OAuth user profile: {exc}") from exc

        if response.status_code >= 400:
            raise AuthError(
                f"OAuth profile request failed ({provider}): {response.text[:200]}"
            )

        data = response.json()
        if provider == "google":
            provider_user_id = data.get("sub")
            if not isinstance(provider_user_id, str) or not provider_user_id:
                raise AuthError("Google profile response missing sub")
            return {
                "provider_user_id": provider_user_id,
                "email": data.get("email")
                if isinstance(data.get("email"), str)
                else None,
                "display_name": data.get("name")
                if isinstance(data.get("name"), str)
                else None,
                "avatar_url": data.get("picture")
                if isinstance(data.get("picture"), str)
                else None,
            }

        provider_user_id = data.get("id")
        if not isinstance(provider_user_id, str) or not provider_user_id:
            raise AuthError("Discord profile response missing id")

        avatar_url: str | None = None
        avatar_hash = data.get("avatar")
        if isinstance(avatar_hash, str) and avatar_hash:
            avatar_url = f"https://cdn.discordapp.com/avatars/{provider_user_id}/{avatar_hash}.png?size=128"

        display_name = None
        if isinstance(data.get("global_name"), str) and data.get("global_name"):
            display_name = data.get("global_name")
        elif isinstance(data.get("username"), str) and data.get("username"):
            display_name = data.get("username")

        return {
            "provider_user_id": provider_user_id,
            "email": data.get("email") if isinstance(data.get("email"), str) else None,
            "display_name": display_name,
            "avatar_url": avatar_url,
        }

    def _provider_credentials(self, provider: str) -> tuple[str | None, str | None]:
        if provider == "google":
            return self.settings.google_client_id, self.settings.google_client_secret
        if provider == "discord":
            return self.settings.discord_client_id, self.settings.discord_client_secret
        return None, None

    def _callback_url(self, *, provider: str, request: Request) -> str:
        if self.settings.auth_redirect_base_url:
            return (
                f"{self.settings.auth_redirect_base_url}/api/auth/{provider}/callback"
            )

        endpoint_name = f"auth_{provider}_callback"
        return str(request.url_for(endpoint_name))

    def _sanitize_next_url(self, value: str | None) -> str:
        fallback = f"{self.settings.frontend_base_url}/?tab=player"
        if not value:
            return fallback

        parsed = urlparse(value)
        if not parsed.scheme:
            if value.startswith("/"):
                return f"{self.settings.frontend_base_url}{value}"
            return fallback

        allowed = urlparse(self.settings.frontend_base_url)
        if parsed.scheme == allowed.scheme and parsed.netloc == allowed.netloc:
            return value

        return fallback

    def _encode_signed_payload(self, payload: dict[str, Any]) -> str:
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )
        body_b64 = base64.urlsafe_b64encode(body).decode("ascii").rstrip("=")

        signature = hmac.new(
            self._secret, body_b64.encode("utf-8"), hashlib.sha256
        ).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
        return f"{body_b64}.{signature_b64}"

    def _decode_signed_payload(self, token: str | None) -> dict[str, Any] | None:
        if not token or "." not in token:
            return None

        body_b64, signature_b64 = token.split(".", 1)
        expected_sig = hmac.new(
            self._secret,
            body_b64.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        try:
            provided_sig = base64.urlsafe_b64decode(self._with_padding(signature_b64))
        except Exception:
            return None

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        try:
            body_raw = base64.urlsafe_b64decode(self._with_padding(body_b64))
            payload = json.loads(body_raw.decode("utf-8"))
        except Exception:
            return None

        exp = payload.get("exp")
        if not isinstance(exp, int) or exp < int(time.time()):
            return None

        if not isinstance(payload, dict):
            return None
        return payload

    @staticmethod
    def _with_padding(value: str) -> str:
        remainder = len(value) % 4
        if remainder == 0:
            return value
        return value + ("=" * (4 - remainder))
