from __future__ import annotations

from dataclasses import dataclass
import random
from typing import Any

from app.models import MapCatalogEntry, TeamCommonRequest, TeamRandomRequest
from app.services.kog_client import KoGApiClient, KoGApiError
from app.services.map_catalog import MapCatalogService


@dataclass
class PlayerSnapshot:
    name: str
    rank: int | None
    total_points: int | None
    unfinished_count: int


class TeamPlannerService:
    def __init__(
        self, kog_client: KoGApiClient, map_catalog: MapCatalogService
    ) -> None:
        self.kog_client = kog_client
        self.map_catalog = map_catalog

    def common_unfinished(self, request: TeamCommonRequest) -> dict[str, Any]:
        players = self._normalize_players(
            players=request.players,
            players_text=request.players_text,
            delimiter=request.delimiter,
        )
        if len(players) < 1:
            raise ValueError("At least one player is required")

        player_snapshots: list[PlayerSnapshot] = []
        unfinished_by_player: dict[str, set[str]] = {}

        for player in players:
            payload = self.kog_client.get_player(player)
            status = payload.get("status")
            if status not in (None, 200):
                raise KoGApiError(f"KoG returned status={status} for player '{player}'")

            data = payload.get("data")
            if not isinstance(data, dict):
                raise KoGApiError(f"Player '{player}' payload missing data object")

            points = data.get("points") if isinstance(data.get("points"), dict) else {}

            unfinished_rows = data.get("unfinishedMaps")
            unfinished_set: set[str] = set()
            if isinstance(unfinished_rows, list):
                for row in unfinished_rows:
                    if isinstance(row, dict):
                        map_name = row.get("Map")
                        if isinstance(map_name, str) and map_name.strip():
                            unfinished_set.add(map_name.strip())

            player_snapshots.append(
                PlayerSnapshot(
                    name=player,
                    rank=self._as_int(points.get("Rank")),
                    total_points=self._as_int(points.get("TPoints")),
                    unfinished_count=len(unfinished_set),
                )
            )
            unfinished_by_player[player] = unfinished_set

        common_maps = self._intersect_sets(list(unfinished_by_player.values()))
        catalog_entries = self.map_catalog.get_catalog()
        catalog_by_name = {
            entry.name.lower(): entry for entry in catalog_entries if entry.name.strip()
        }

        filtered = self._enrich_and_filter_maps(
            common_maps=common_maps,
            catalog_by_name=catalog_by_name,
            difficulty=request.difficulty,
            stars=request.stars,
            include_unknown_metadata=request.include_unknown_metadata,
        )

        return {
            "players": players,
            "filters": {
                "difficulty": request.difficulty,
                "stars": request.stars,
                "include_unknown_metadata": request.include_unknown_metadata,
            },
            "player_summaries": [snapshot.__dict__ for snapshot in player_snapshots],
            "common_unfinished_total": len(common_maps),
            "common_unfinished_filtered": len(filtered),
            "maps": filtered,
            "catalog": self.map_catalog.cache_info(),
        }

    def random_unfinished(self, request: TeamRandomRequest) -> dict[str, Any]:
        common_result = self.common_unfinished(request)
        pool = common_result.get("maps", [])
        if not isinstance(pool, list):
            raise ValueError("Internal error: expected map pool list")

        rng = random.Random(request.seed)
        if request.count >= len(pool):
            picks = list(pool)
            rng.shuffle(picks)
        else:
            picks = rng.sample(pool, request.count)

        common_result["random"] = {
            "seed": request.seed,
            "requested": request.count,
            "returned": len(picks),
            "maps": picks,
        }
        return common_result

    def _enrich_and_filter_maps(
        self,
        *,
        common_maps: set[str],
        catalog_by_name: dict[str, MapCatalogEntry],
        difficulty: str | None,
        stars: int | None,
        include_unknown_metadata: bool,
    ) -> list[dict[str, Any]]:
        target_difficulty = (
            difficulty.strip().lower() if isinstance(difficulty, str) else None
        )

        results: list[dict[str, Any]] = []
        for map_name in sorted(common_maps, key=str.lower):
            meta = catalog_by_name.get(map_name.lower())

            entry = {
                "name": map_name,
                "difficulty": meta.difficulty if meta else None,
                "stars": meta.stars if meta else None,
                "points": meta.points if meta else None,
                "author": meta.author if meta else None,
                "released_at": meta.released_at if meta else None,
                "metadata_found": bool(meta),
            }

            if target_difficulty:
                value = entry["difficulty"]
                if (
                    not isinstance(value, str)
                    or value.strip().lower() != target_difficulty
                ):
                    continue

            if stars is not None:
                if entry["stars"] != stars:
                    continue

            if not include_unknown_metadata and not entry["metadata_found"]:
                continue

            results.append(entry)

        return results

    @staticmethod
    def _normalize_players(
        *, players: list[str], players_text: str | None, delimiter: str
    ) -> list[str]:
        items: list[str] = []
        items.extend(players)

        if players_text:
            split_delimiter = delimiter or ","
            if split_delimiter in {"\\n", "\\r\\n", "newline"}:
                chunks = players_text.splitlines()
            else:
                chunks = players_text.split(split_delimiter)
            items.extend(chunks)

        deduped: list[str] = []
        seen: set[str] = set()

        for item in items:
            if not isinstance(item, str):
                continue
            name = item.strip()
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(name)

        return deduped

    @staticmethod
    def _intersect_sets(sets: list[set[str]]) -> set[str]:
        if not sets:
            return set()
        current = set(sets[0])
        for value in sets[1:]:
            current &= value
        return current

    @staticmethod
    def _as_int(value: Any) -> int | None:
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        try:
            return int(str(value))
        except Exception:
            return None
