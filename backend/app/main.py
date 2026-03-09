from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import TeamCommonRequest, TeamRandomRequest
from app.services.kog_client import KoGApiClient, KoGApiError
from app.services.map_catalog import MapCatalogService
from app.services.planner import TeamPlannerService


settings = get_settings()

kog_client = KoGApiClient(
    timezone=settings.timezone,
    timeout=settings.request_timeout_seconds,
    player_cache_ttl_seconds=settings.player_cache_ttl_seconds,
    player_cache_redis_url=settings.player_cache_redis_url,
    bootstrap_browser=settings.bootstrap_browser,
    cf_clearance=settings.cf_clearance,
    php_sessid=settings.php_sessid,
    debug=settings.debug,
)

map_catalog_service = MapCatalogService(
    kog_client=kog_client,
    ttl_seconds=settings.map_cache_ttl_seconds,
)

planner_service = TeamPlannerService(
    kog_client=kog_client,
    map_catalog=map_catalog_service,
)


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _player_summary(data: dict[str, Any]) -> dict[str, Any]:
    points = data.get("points") if isinstance(data.get("points"), dict) else {}
    finished = (
        data.get("finishedMaps") if isinstance(data.get("finishedMaps"), list) else []
    )
    unfinished = (
        data.get("unfinishedMaps")
        if isinstance(data.get("unfinishedMaps"), list)
        else []
    )
    return {
        "rank": points.get("Rank"),
        "name": points.get("Name"),
        "total_points": points.get("TPoints"),
        "pvp_points": points.get("PvPpoints"),
        "finished_count": len(finished),
        "unfinished_count": len(unfinished),
    }


def _handle_error(exc: Exception) -> None:
    if isinstance(exc, ValueError):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if isinstance(exc, KoGApiError):
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "environment": settings.app_env,
        "cors_origins": settings.cors_origins,
        "map_catalog": map_catalog_service.cache_info(),
        "player_cache": kog_client.player_cache_info(),
    }


@app.get("/api/player/{player_name}")
def get_player(player_name: str) -> dict[str, Any]:
    try:
        payload = kog_client.get_player(player_name)
        data = payload.get("data")
        if not isinstance(data, dict):
            raise KoGApiError("Unexpected player payload: missing data object")

        return {
            "status": "ok",
            "player": player_name,
            "source_status": payload.get("status"),
            "summary": _player_summary(data),
            "data": data,
        }
    except Exception as exc:
        _handle_error(exc)


@app.get("/api/maps/catalog")
def maps_catalog(refresh: bool = Query(default=False)) -> dict[str, Any]:
    try:
        entries = map_catalog_service.get_catalog(force_refresh=refresh)
        return {
            "status": "ok",
            "count": len(entries),
            "cache": map_catalog_service.cache_info(),
            "maps": [entry.model_dump() for entry in entries],
        }
    except Exception as exc:
        _handle_error(exc)


@app.post("/api/team/common")
def team_common(request: TeamCommonRequest) -> dict[str, Any]:
    try:
        result = planner_service.common_unfinished(request)
        return {
            "status": "ok",
            **result,
        }
    except Exception as exc:
        _handle_error(exc)


@app.post("/api/team/random")
def team_random(request: TeamRandomRequest) -> dict[str, Any]:
    try:
        result = planner_service.random_unfinished(request)
        return {
            "status": "ok",
            **result,
        }
    except Exception as exc:
        _handle_error(exc)
