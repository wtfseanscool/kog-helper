# Local Testing Guide

## Backend

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If requests are blocked, set one of:

- `KOG_CF_CLEARANCE` + `KOG_PHPSESSID`, or
- `KOG_BOOTSTRAP_BROWSER=true`

Caching:

- `PLAYER_CACHE_TTL_SECONDS=1800` enables 30-minute player cache TTL.
- Optional production-style local cache: set `PLAYER_CACHE_REDIS_URL=redis://localhost:6379/0`.
- If Redis is down/unreachable, backend falls back to in-memory automatically.

Quick checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/player/White-King
```

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`.

## Manual UI checks

1. Player lookup loads stats/charts/tables.
2. Team Planner computes shared unfinished maps.
3. Random picks respect seed and count.
4. Copy map names works.
5. CSV export downloads correctly.
6. Share link restores Team Planner state.

## Static checks

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
python -m py_compile app/main.py app/config.py app/models.py app/services/kog_client.py app/services/map_catalog.py app/services/planner.py
```
