from __future__ import annotations

import json
import threading
import time
from typing import Any

from curl_cffi import requests
from curl_cffi.requests.errors import RequestsError

from app.services.player_cache import PlayerCacheStore


class KoGApiError(RuntimeError):
    """Raised when KoG API responses are blocked/invalid."""


class KoGApiClient:
    def __init__(
        self,
        *,
        base_url: str = "https://kog.tw",
        timezone: str = "UTC",
        timeout: float = 30.0,
        player_cache_ttl_seconds: int = 1800,
        player_cache_redis_url: str | None = None,
        bootstrap_browser: bool = False,
        proxy_url: str | None = None,
        debug: bool = False,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timezone = timezone
        self.timeout = timeout
        self.player_cache_ttl_seconds = max(0, int(player_cache_ttl_seconds))
        self.bootstrap_browser = bootstrap_browser
        self.debug = debug
        self._bootstrapped = False
        self._lock = threading.Lock()

        self.player_cache = PlayerCacheStore(
            ttl_seconds=self.player_cache_ttl_seconds,
            redis_url=player_cache_redis_url,
            debug=debug,
        )

        self.session = requests.Session(impersonate="chrome120")
        self.proxy_url = proxy_url

        if proxy_url:
            self.session.proxies = {
                "http": proxy_url,
                "https": proxy_url,
            }

        self.session.headers.update(
            {
                "Referer": f"{self.base_url}/",
                "Accept": "application/json, text/plain, */*",
            }
        )

    def _log(self, message: str) -> None:
        if self.debug:
            print(f"[KoGApiClient] {message}")

    def _set_cookie(self, name: str, value: str) -> None:
        self.session.cookies.set(name, value, domain="kog.tw", path="/")

    def player_cache_info(self) -> dict[str, Any]:
        return self.player_cache.info()

    def _establish_cloudflare_session(self) -> None:
        self._log("Establishing Cloudflare session via main page hit...")
        try:
            self.session.get(f"{self.base_url}/", timeout=self.timeout)
            self._bootstrapped = True
        except RequestsError as exc:
            self._log(f"Failed to cleanly establish Cloudflare session: {exc}")

    def _get_nonce(self) -> str:
        endpoint = f"{self.base_url}/api.php?type=csrf-token"
        max_attempts = 4
        last_error: Exception | None = None

        for attempt in range(max_attempts):
            try:
                response = self.session.get(endpoint, timeout=self.timeout)
            except RequestsError as exc:
                last_error = exc
                self._log(
                    f"csrf-token request failed ({attempt + 1}/{max_attempts}): {exc}"
                )
                if attempt == 0 and self.bootstrap_browser:
                    self._establish_cloudflare_session()
                if attempt < max_attempts - 1:
                    time.sleep(0.5 + attempt)
                    continue
                raise KoGApiError(
                    f"Request error while fetching csrf-token: {exc}"
                ) from exc
            text = response.text.strip()

            if text:
                try:
                    data = response.json()
                except Exception as exc:
                    last_error = exc
                    self._log(
                        f"csrf-token parse failed ({attempt + 1}/{max_attempts}): {text[:120]}"
                    )
                    if attempt == 0 and self.bootstrap_browser:
                        self._establish_cloudflare_session()
                    if attempt < max_attempts - 1:
                        time.sleep(0.5 + attempt)
                        continue
                    raise KoGApiError(
                        f"Could not parse csrf-token JSON: {text[:160]}"
                    ) from exc

                nonce = data.get("nonce")
                if isinstance(nonce, str) and nonce:
                    return nonce
                last_error = KoGApiError(f"csrf-token missing nonce: {data}")
                if attempt == 0 and self.bootstrap_browser:
                    self._establish_cloudflare_session()
                if attempt < max_attempts - 1:
                    time.sleep(0.5 + attempt)
                    continue
                raise KoGApiError(f"csrf-token missing nonce: {data}")

            if attempt == 0 and self.bootstrap_browser:
                self._establish_cloudflare_session()
            if attempt < max_attempts - 1:
                time.sleep(0.5 + attempt)
                continue

            raise KoGApiError(
                "Empty csrf-token response. Set KOG_CF_CLEARANCE/KOG_PHPSESSID "
                "or enable bootstrap_browser."
            )

        raise KoGApiError(f"Unable to get nonce after retries: {last_error}")

    def fetch_page_html(self, page_id: str) -> str:
        path = f"/get.php?p={page_id}"
        endpoint = f"{self.base_url}{path}"

        for attempt in range(2):
            try:
                response = self.session.get(endpoint, timeout=self.timeout)
            except RequestsError as exc:
                raise KoGApiError(
                    f"Request error while fetching {path}: {exc}"
                ) from exc
            body = response.text
            if response.status_code == 200 and body:
                return body

            if attempt == 0:
                self._establish_cloudflare_session()
                continue

            raise KoGApiError(
                f"Failed to fetch {path}. status={response.status_code} len={len(body)}"
            )

        raise KoGApiError(f"Unable to fetch page {page_id}")

    def call(self, api_type: str, **params: Any) -> Any:
        endpoint = f"{self.base_url}/api.php"
        payload = dict(params)
        payload["type"] = api_type
        if self.timezone and "tz" not in payload:
            payload["tz"] = self.timezone

        with self._lock:
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    nonce = self._get_nonce()
                except KoGApiError as exc:
                    if attempt < max_attempts - 1:
                        self._log(
                            f"nonce acquisition failed before api.php call ({attempt + 1}/{max_attempts}): {exc}"
                        )
                        time.sleep(0.5 + attempt)
                        continue
                    raise
                request_payload = dict(payload)
                request_payload["nonce"] = nonce

                try:
                    response = self.session.post(
                        endpoint,
                        json=request_payload,
                        timeout=self.timeout,
                    )
                except RequestsError as exc:
                    if attempt < max_attempts - 1:
                        self._log(
                            f"api.php request failed ({attempt + 1}/{max_attempts}): {exc}"
                        )
                        time.sleep(0.5 + attempt)
                        continue
                    raise KoGApiError(
                        f"Request error while calling api.php: {exc}"
                    ) from exc
                body = response.text.strip()

                if not body:
                    # The kog.tw API returns an empty body if the player isn't found.
                    # Since we fetch a fresh nonce right before this, we assume it's just missing data.
                    return {"status": 404, "data": None}

                try:
                    data = response.json()
                except Exception as exc:
                    if attempt < max_attempts - 1:
                        self._log(
                            f"api.php returned non-JSON ({attempt + 1}/{max_attempts}): {body[:120]}"
                        )
                        time.sleep(0.5 + attempt)
                        continue
                    raise KoGApiError(
                        f"api.php returned non-JSON: {body[:180]}"
                    ) from exc

                if isinstance(data, dict) and isinstance(data.get("data"), str):
                    try:
                        data["data"] = json.loads(data["data"])
                    except json.JSONDecodeError:
                        pass

                return data

        raise KoGApiError("api.php call failed after retries")

    def get_player(self, player_name: str) -> dict[str, Any]:
        cached = self.player_cache.get(player_name)
        if cached is not None:
            self._log(f"Player cache hit: {player_name}")
            return cached

        result = self.call("players", player=player_name)
        if not isinstance(result, dict):
            raise KoGApiError("Unexpected players response type")

        if result.get("status") in (None, 200) and isinstance(result.get("data"), dict):
            self.player_cache.set(player_name, result)
        return result
