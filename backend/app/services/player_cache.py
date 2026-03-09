from __future__ import annotations

import copy
import json
import threading
import time
from typing import Any

try:
    import redis
except Exception:
    redis = None


class PlayerCacheStore:
    def __init__(
        self,
        *,
        ttl_seconds: int = 1800,
        redis_url: str | None = None,
        key_prefix: str = "kog:player",
        debug: bool = False,
    ) -> None:
        self.ttl_seconds = max(0, int(ttl_seconds))
        self.redis_url = (redis_url or "").strip() or None
        self.key_prefix = key_prefix
        self.debug = debug

        self._lock = threading.Lock()
        self._memory: dict[str, tuple[float, dict[str, Any]]] = {}

        self._redis_client: Any | None = None
        self._redis_last_error: str | None = None

        self._hits_memory = 0
        self._hits_redis = 0
        self._misses = 0

        self._init_redis()

    def _log(self, message: str) -> None:
        if self.debug:
            print(f"[PlayerCacheStore] {message}")

    def _init_redis(self) -> None:
        if self.ttl_seconds <= 0:
            return

        if not self.redis_url:
            return

        if redis is None:
            self._redis_last_error = "redis package not installed"
            self._log("Redis cache unavailable: redis package not installed")
            return

        try:
            client = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2,
            )
            client.ping()
            self._redis_client = client
            self._redis_last_error = None
            self._log("Redis cache initialized")
        except Exception as exc:
            self._redis_client = None
            self._redis_last_error = str(exc)
            self._log(f"Redis cache unavailable: {exc}")

    @staticmethod
    def _cache_key(player_name: str) -> str:
        return player_name.strip().casefold()

    def _redis_key(self, player_name: str) -> str:
        return f"{self.key_prefix}:{self._cache_key(player_name)}"

    def _prune_memory_locked(self, now: float) -> None:
        if self.ttl_seconds <= 0:
            self._memory.clear()
            return

        expired = [
            key
            for key, (cached_at, _) in self._memory.items()
            if (now - cached_at) > self.ttl_seconds
        ]
        for key in expired:
            self._memory.pop(key, None)

    def _disable_redis(self, reason: str) -> None:
        self._redis_client = None
        self._redis_last_error = reason
        self._log(f"Redis disabled, falling back to memory: {reason}")

    def get(self, player_name: str) -> dict[str, Any] | None:
        if self.ttl_seconds <= 0:
            return None

        now = time.time()
        key = self._cache_key(player_name)

        with self._lock:
            self._prune_memory_locked(now)
            cached = self._memory.get(key)
            if cached is not None:
                _, payload = cached
                self._hits_memory += 1
                return copy.deepcopy(payload)

        if self._redis_client is not None:
            try:
                raw = self._redis_client.get(self._redis_key(player_name))
                if isinstance(raw, str) and raw:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        with self._lock:
                            self._memory[key] = (now, copy.deepcopy(parsed))
                            self._hits_redis += 1
                        return copy.deepcopy(parsed)
            except Exception as exc:
                self._disable_redis(str(exc))

        with self._lock:
            self._misses += 1
        return None

    def set(self, player_name: str, payload: dict[str, Any]) -> None:
        if self.ttl_seconds <= 0:
            return

        now = time.time()
        key = self._cache_key(player_name)

        with self._lock:
            self._prune_memory_locked(now)
            self._memory[key] = (now, copy.deepcopy(payload))

        if self._redis_client is not None:
            try:
                self._redis_client.set(
                    self._redis_key(player_name),
                    json.dumps(payload, ensure_ascii=True),
                    ex=self.ttl_seconds,
                )
            except Exception as exc:
                self._disable_redis(str(exc))

    def info(self) -> dict[str, Any]:
        with self._lock:
            self._prune_memory_locked(time.time())
            return {
                "enabled": self.ttl_seconds > 0,
                "ttl_seconds": self.ttl_seconds,
                "backend": "redis+memory"
                if self._redis_client is not None
                else "memory",
                "redis_configured": bool(self.redis_url),
                "redis_available": self._redis_client is not None,
                "redis_last_error": self._redis_last_error,
                "memory_entries": len(self._memory),
                "hits_memory": self._hits_memory,
                "hits_redis": self._hits_redis,
                "misses": self._misses,
            }
