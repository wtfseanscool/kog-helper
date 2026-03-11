# Backend (KoG Team Planner API)

FastAPI service that:

- Talks to KoG API with nonce/session handling
- Scrapes map metadata from KoG map cards
- Computes team-wide common unfinished map pools
- Supports filtered random picks

## Local setup

```bash
python -m pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The app auto-loads `backend/.env` at startup.

## Endpoints

- `GET /health`
- `GET /api/auth/providers`
- `GET /api/auth/me`
- `POST /api/auth/profile`
- `POST /api/auth/logout`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/discord/start`
- `GET /api/auth/discord/callback`
- `GET /api/player/{player_name}`
- `GET /api/maps/catalog?refresh=false`
- `POST /api/team/common`
- `POST /api/team/random`

## Environment notes

- KoG can require valid Cloudflare/session cookies.
- Recommended prod env vars:
  - `CORS_ORIGINS`
  - `FRONTEND_BASE_URL`
  - `AUTH_SECRET_KEY`
  - `AUTH_SESSION_TTL_SECONDS`
  - `AUTH_COOKIE_SECURE`
  - `AUTH_DB_PATH`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
  - `AUTH_REDIRECT_BASE_URL` (when backend is behind a proxy / custom domain)
  - `PLAYER_CACHE_TTL_SECONDS` (default `1800` = 30 min)
  - `PLAYER_CACHE_REDIS_URL` (recommended in production)
  - `KOG_BOOTSTRAP_BROWSER` (`true` recommended when csrf-token is blocked)
  - `PLAYWRIGHT_BROWSERS_PATH` (`0` recommended on Render)
  - `KOG_CF_CLEARANCE` (optional)
  - `KOG_PHPSESSID` (optional)
- Cache behavior:
  - Uses Redis when `PLAYER_CACHE_REDIS_URL` is reachable.
  - Falls back to local in-memory cache automatically if Redis is unavailable.
  - Map catalog refresh now falls back to stale cache if upstream fetch fails.
- Local fallback:
  - `KOG_BOOTSTRAP_BROWSER=true` (requires Playwright installed)

## Deployment configs in repo

- Render blueprint: `../render.yaml`
- Railway config: `railway.json`
- Procfile: `Procfile`
- Optional Render keep-warm workflow: `../.github/workflows/keep-render-warm.yml`
  - Optional repo variable: `RENDER_PING_BASE_URL` (defaults to current Render URL)
