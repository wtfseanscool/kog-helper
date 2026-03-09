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
- `GET /api/player/{player_name}`
- `GET /api/maps/catalog?refresh=false`
- `POST /api/team/common`
- `POST /api/team/random`

## Environment notes

- KoG can require valid Cloudflare/session cookies.
- Recommended prod env vars:
  - `CORS_ORIGINS`
  - `PLAYER_CACHE_TTL_SECONDS` (default `1800` = 30 min)
  - `PLAYER_CACHE_REDIS_URL` (recommended in production)
  - `KOG_BOOTSTRAP_BROWSER` (`true` recommended when csrf-token is blocked)
  - `PLAYWRIGHT_BROWSERS_PATH` (`0` recommended on Render)
  - `KOG_CF_CLEARANCE` (optional)
  - `KOG_PHPSESSID` (optional)
- Cache behavior:
  - Uses Redis when `PLAYER_CACHE_REDIS_URL` is reachable.
  - Falls back to local in-memory cache automatically if Redis is unavailable.
- Local fallback:
  - `KOG_BOOTSTRAP_BROWSER=true` (requires Playwright installed)

## Deployment configs in repo

- Render blueprint: `../render.yaml`
- Railway config: `railway.json`
- Procfile: `Procfile`
