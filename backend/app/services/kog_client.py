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
        proxy_urls: list[str] | None = None,
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

        self._proxy_urls = list(proxy_urls) if proxy_urls else []
        self._proxy_index = 0

        self.session = requests.Session(impersonate="chrome120")
        self._apply_current_proxy()

        self.session.headers.update(
            {
                "Referer": f"{self.base_url}/",
                "Accept": "application/json, text/plain, */*",
            }
        )

    def _apply_current_proxy(self) -> None:
        """Set the session proxy to the current proxy in the pool (or none)."""
        if self._proxy_urls:
            url = self._proxy_urls[self._proxy_index % len(self._proxy_urls)]
            self.session.proxies = {"http": url, "https": url}
            self._log(f"Using proxy: {url}")
        else:
            self.session.proxies = {}

    def _rotate_proxy(self) -> bool:
        """Advance to the next proxy. Returns True if a new proxy is available."""
        if not self._proxy_urls:
            return False
        self._proxy_index = (self._proxy_index + 1) % len(self._proxy_urls)
        self._apply_current_proxy()
        # Reset session cookies so the new proxy gets a fresh Cloudflare session
        self.session.cookies.clear()
        self._bootstrapped = False
        return True

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
        proxies_to_try = max(len(self._proxy_urls), 1)
        last_error: Exception | None = None

        for _proxy_round in range(proxies_to_try):
            for attempt in range(max_attempts):
                try:
                    response = self.session.get(endpoint, timeout=self.timeout)
                except RequestsError as exc:
                    last_error = exc
                    self._log(
                        f"csrf-token request failed ({attempt + 1}/{max_attempts}): {exc}"
                    )
                    if attempt == 0:
                        self._establish_cloudflare_session()
                    if attempt < max_attempts - 1:
                        time.sleep(0.5 + attempt)
                        continue
                    # All attempts exhausted on this proxy – try next
                    break
                text = response.text.strip()

                if text:
                    try:
                        data = response.json()
                    except Exception as exc:
                        last_error = exc
                        self._log(
                            f"csrf-token parse failed ({attempt + 1}/{max_attempts}): {text[:120]}"
                        )
                        if attempt == 0:
                            self._establish_cloudflare_session()
                        if attempt < max_attempts - 1:
                            time.sleep(0.5 + attempt)
                            continue
                        break

                    nonce = data.get("nonce")
                    if isinstance(nonce, str) and nonce:
                        return nonce
                    last_error = KoGApiError(f"csrf-token missing nonce: {data}")
                    if attempt == 0:
                        self._establish_cloudflare_session()
                    if attempt < max_attempts - 1:
                        time.sleep(0.5 + attempt)
                        continue
                    break

                if attempt == 0:
                    self._establish_cloudflare_session()
                if attempt < max_attempts - 1:
                    time.sleep(0.5 + attempt)
                    continue
                break

            # This proxy failed – rotate if possible
            if not self._rotate_proxy():
                break
            self._log("Rotated to next proxy, retrying nonce acquisition...")
            self._establish_cloudflare_session()

        raise KoGApiError(f"Unable to get nonce after trying all proxies: {last_error}")

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
