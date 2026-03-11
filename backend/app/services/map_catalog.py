from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import re
import threading
import time

from bs4 import BeautifulSoup

from app.models import MapCatalogEntry
from app.services.kog_client import KoGApiClient


POINTS_PATTERN = re.compile(r"(\d+)\s+points", re.IGNORECASE)


@dataclass
class _CatalogCache:
    loaded_at_unix: float
    entries: list[MapCatalogEntry]


class MapCatalogService:
    def __init__(self, kog_client: KoGApiClient, ttl_seconds: int = 21600) -> None:
        self.kog_client = kog_client
        self.ttl_seconds = ttl_seconds
        self._cache: _CatalogCache | None = None
        self._last_refresh_error: str | None = None
        self._last_refresh_error_at_unix: float | None = None
        self._lock = threading.Lock()

    def cache_info(self) -> dict[str, str | int | None]:
        with self._lock:
            error_at = None
            if self._last_refresh_error_at_unix is not None:
                error_at = datetime.fromtimestamp(
                    self._last_refresh_error_at_unix, tz=timezone.utc
                ).isoformat()

            if not self._cache:
                return {
                    "cached": False,
                    "ttl_seconds": self.ttl_seconds,
                    "loaded_at": None,
                    "last_refresh_error": self._last_refresh_error,
                    "last_refresh_error_at": error_at,
                }

            loaded_at = datetime.fromtimestamp(
                self._cache.loaded_at_unix, tz=timezone.utc
            ).isoformat()
            return {
                "cached": True,
                "ttl_seconds": self.ttl_seconds,
                "loaded_at": loaded_at,
                "map_count": len(self._cache.entries),
                "last_refresh_error": self._last_refresh_error,
                "last_refresh_error_at": error_at,
            }

    def get_catalog(self, force_refresh: bool = False) -> list[MapCatalogEntry]:
        with self._lock:
            cache = self._cache
            if (
                not force_refresh
                and cache is not None
                and (time.time() - cache.loaded_at_unix) < self.ttl_seconds
            ):
                return cache.entries

        try:
            entries = self._fetch_catalog()
        except Exception as exc:
            with self._lock:
                self._last_refresh_error = str(exc)
                self._last_refresh_error_at_unix = time.time()
                stale_cache = self._cache

            if stale_cache is not None and stale_cache.entries:
                return stale_cache.entries

            raise

        with self._lock:
            self._cache = _CatalogCache(loaded_at_unix=time.time(), entries=entries)
            self._last_refresh_error = None
            self._last_refresh_error_at_unix = None

        return entries

    def _fetch_catalog(self) -> list[MapCatalogEntry]:
        html = self.kog_client.fetch_page_html("maps")
        soup = BeautifulSoup(html, "html.parser")

        entries: list[MapCatalogEntry] = []
        for card in soup.select("div.card.mb-4.box-shadow"):
            map_name = self._text_or_none(card.select_one("div.card-header h4"))
            if not map_name:
                continue

            list_items = card.select("ul.list-group li.list-group-item")

            stars = None
            if list_items:
                stars = len(list_items[0].select("i.bi-star-fill"))

            difficulty = self._safe_list_text(list_items, 1)
            points_raw = self._safe_list_text(list_items, 2)
            author = self._safe_list_text(list_items, 3)

            points = None
            if points_raw:
                points_match = POINTS_PATTERN.search(points_raw)
                if points_match:
                    points = int(points_match.group(1))

            footer_text = self._text_or_none(card.select_one("div.card-footer"))
            released_at = None
            if footer_text:
                released_at = footer_text.replace("Released at", "").strip()

            entries.append(
                MapCatalogEntry(
                    name=map_name,
                    stars=stars,
                    difficulty=difficulty,
                    points=points,
                    author=author,
                    released_at=released_at,
                )
            )

        return entries

    @staticmethod
    def _text_or_none(node: object) -> str | None:
        if node is None:
            return None
        text = node.get_text(" ", strip=True)
        if not text:
            return None
        return text

    def _safe_list_text(self, items: list[object], idx: int) -> str | None:
        if idx >= len(items):
            return None
        return self._text_or_none(items[idx])
