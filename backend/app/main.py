from __future__ import annotations

from typing import Any, NoReturn
from urllib.parse import quote_plus, urlsplit, urlunsplit

from fastapi import (
    Cookie,
    FastAPI,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.models import ProfileUpdateRequest, TeamCommonRequest, TeamRandomRequest
from app.services.auth import AuthError, AuthService
from app.services.auth_store import AuthStore
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
    proxy_url=settings.kog_proxy_url,
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

auth_store = AuthStore(db_path=settings.auth_db_path)
auth_service = AuthService(settings=settings, store=auth_store)

AUTH_SESSION_COOKIE = "kog_session"
AUTH_STATE_COOKIE = "kog_oauth_state"


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _player_summary(data: dict[str, Any]) -> dict[str, Any]:
    raw_points = data.get("points")
    points = raw_points if isinstance(raw_points, dict) else {}

    raw_finished = data.get("finishedMaps")
    finished = raw_finished if isinstance(raw_finished, list) else []

    raw_unfinished = data.get("unfinishedMaps")
    unfinished = raw_unfinished if isinstance(raw_unfinished, list) else []

    return {
        "rank": points.get("Rank"),
        "name": points.get("Name"),
        "total_points": points.get("TPoints"),
        "pvp_points": points.get("PvPpoints"),
        "finished_count": len(finished),
        "unfinished_count": len(unfinished),
    }


def _handle_error(exc: Exception) -> NoReturn:
    if isinstance(exc, ValueError):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if isinstance(exc, KoGApiError):
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    raise HTTPException(status_code=500, detail=str(exc)) from exc


def _set_auth_session_cookie(response: Response, session_token: str) -> None:
    cookie_samesite = "none" if settings.auth_cookie_secure else "lax"
    response.set_cookie(
        key=AUTH_SESSION_COOKIE,
        value=session_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=cookie_samesite,
        max_age=max(3600, settings.auth_session_ttl_seconds),
        path="/",
    )


def _clear_auth_session_cookie(response: Response) -> None:
    cookie_samesite = "none" if settings.auth_cookie_secure else "lax"
    response.delete_cookie(
        key=AUTH_SESSION_COOKIE,
        path="/",
        samesite=cookie_samesite,
        secure=settings.auth_cookie_secure,
    )


def _get_current_user_or_401(session_token: str | None):
    user = auth_service.get_user_from_session(session_token)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return None

    normalized = token.strip()
    return normalized or None


def _resolve_session_token(
    cookie_session_token: str | None,
    authorization: str | None,
) -> str | None:
    bearer = _extract_bearer_token(authorization)
    if bearer:
        return bearer
    return cookie_session_token


def _append_fragment_params(url: str, params: dict[str, str]) -> str:
    parsed = urlsplit(url)

    existing_parts: list[str] = []
    if parsed.fragment:
        existing_parts.append(parsed.fragment)

    for key, value in params.items():
        existing_parts.append(f"{key}={quote_plus(value)}")

    fragment = "&".join(existing_parts)
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, parsed.query, fragment)
    )


@app.on_event("startup")
def warm_map_catalog_cache() -> None:
    try:
        map_catalog_service.get_catalog(force_refresh=False)
    except Exception:
        # Keep startup resilient; requests can still warm cache on-demand.
        pass


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "environment": settings.app_env,
        "cors_origins": settings.cors_origins,
        "kog_session": {
            "bootstrap_browser": settings.bootstrap_browser,
            "has_cf_clearance": bool(settings.cf_clearance),
            "has_php_sessid": bool(settings.php_sessid),
        },
        "map_catalog": map_catalog_service.cache_info(),
        "player_cache": kog_client.player_cache_info(),
    }


@app.get("/api/auth/providers")
def auth_providers() -> dict[str, Any]:
    return {
        "status": "ok",
        "providers": auth_service.enabled_providers(),
    }


@app.get("/api/auth/me")
def auth_me(
    session_token: str | None = Cookie(default=None, alias=AUTH_SESSION_COOKIE),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, Any]:
    resolved_token = _resolve_session_token(session_token, authorization)
    user = auth_service.get_user_from_session(resolved_token)
    if user is None:
        return {
            "status": "ok",
            "authenticated": False,
            "user": None,
        }

    return {
        "status": "ok",
        "authenticated": True,
        "user": user.as_dict(),
    }


@app.post("/api/auth/profile")
def auth_profile_update(
    payload: ProfileUpdateRequest,
    session_token: str | None = Cookie(default=None, alias=AUTH_SESSION_COOKIE),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, Any]:
    resolved_token = _resolve_session_token(session_token, authorization)
    user = _get_current_user_or_401(resolved_token)
    try:
        updated_user = auth_service.update_kog_name(
            user_id=user.id,
            kog_name=payload.kog_name,
        )
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "status": "ok",
        "user": updated_user.as_dict(),
    }


@app.post("/api/auth/logout")
def auth_logout(response: Response) -> dict[str, Any]:
    _clear_auth_session_cookie(response)
    return {
        "status": "ok",
    }


@app.get("/api/auth/google/start")
def auth_google_start(
    request: Request,
    next: str | None = Query(default=None),
) -> RedirectResponse:
    try:
        authorize_url, state_token = auth_service.start_login(
            provider="google",
            request=request,
            next_url=next,
        )
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = RedirectResponse(url=authorize_url, status_code=302)
    response.set_cookie(
        key=AUTH_STATE_COOKIE,
        value=state_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@app.get("/api/auth/discord/start")
def auth_discord_start(
    request: Request,
    next: str | None = Query(default=None),
) -> RedirectResponse:
    try:
        authorize_url, state_token = auth_service.start_login(
            provider="discord",
            request=request,
            next_url=next,
        )
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = RedirectResponse(url=authorize_url, status_code=302)
    response.set_cookie(
        key=AUTH_STATE_COOKIE,
        value=state_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@app.get("/api/auth/google/callback", name="auth_google_callback")
def auth_google_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    oauth_state: str | None = Cookie(default=None, alias=AUTH_STATE_COOKIE),
) -> RedirectResponse:
    try:
        _user, session_token, next_url = auth_service.finish_login(
            provider="google",
            request=request,
            code=code,
            state=state,
            state_token=oauth_state,
        )
        redirect_url = _append_fragment_params(
            next_url,
            {
                "auth_token": session_token,
                "auth_provider": "google",
            },
        )
        response = RedirectResponse(url=redirect_url, status_code=302)
        _set_auth_session_cookie(response, session_token)
    except AuthError as exc:
        fallback = (
            f"{settings.frontend_base_url}/?auth=error&reason="
            f"{quote_plus(str(exc)[:140])}"
        )
        response = RedirectResponse(url=fallback, status_code=302)
        _clear_auth_session_cookie(response)

    response.delete_cookie(
        key=AUTH_STATE_COOKIE,
        path="/",
        samesite="lax",
        secure=settings.auth_cookie_secure,
    )
    return response


@app.get("/api/auth/discord/callback", name="auth_discord_callback")
def auth_discord_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    oauth_state: str | None = Cookie(default=None, alias=AUTH_STATE_COOKIE),
) -> RedirectResponse:
    try:
        _user, session_token, next_url = auth_service.finish_login(
            provider="discord",
            request=request,
            code=code,
            state=state,
            state_token=oauth_state,
        )
        redirect_url = _append_fragment_params(
            next_url,
            {
                "auth_token": session_token,
                "auth_provider": "discord",
            },
        )
        response = RedirectResponse(url=redirect_url, status_code=302)
        _set_auth_session_cookie(response, session_token)
    except AuthError as exc:
        fallback = (
            f"{settings.frontend_base_url}/?auth=error&reason="
            f"{quote_plus(str(exc)[:140])}"
        )
        response = RedirectResponse(url=fallback, status_code=302)
        _clear_auth_session_cookie(response)

    response.delete_cookie(
        key=AUTH_STATE_COOKIE,
        path="/",
        samesite="lax",
        secure=settings.auth_cookie_secure,
    )
    return response


@app.get("/api/player/{player_name}")
def get_player(player_name: str) -> dict[str, Any]:
    try:
        payload = kog_client.get_player(player_name)
        
        status_code = payload.get("status")
        if status_code == 404 or payload.get("data") is None:
            raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found on kog.tw")
            
        data = payload.get("data")
        # PHP json_encode outputs empty associative arrays as []
        if isinstance(data, list) and not data:
            data = {}
        elif not isinstance(data, dict):
            raise KoGApiError(f"Unexpected player payload: expected dict, got {type(data)}")

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
