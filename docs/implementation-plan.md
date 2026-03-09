# KoG Team Planner - Implementation Plan

## 1) Product goals

Build a lightweight web app that lets users:

1. Search a single KoG player and inspect complete player data in a readable UI.
2. Enter a team of players (custom delimiter, comma default) and compute common unfinished maps.
3. Filter common unfinished maps by difficulty and stars (for example: `Extreme` + `2`).
4. Generate random map picks from the filtered common pool (optionally seeded for reproducibility).

Constraints:

- Frontend is hosted on GitHub Pages (`github.io`).
- KoG API is behind nonce + Cloudflare/session handling and does not expose permissive CORS for direct browser calls.
- Therefore, a separate backend proxy is required.

## 2) High-level architecture

### Frontend (static)

- Stack: `React + TypeScript + Vite + MUI + React Query`.
- Host: GitHub Pages.
- Responsibilities:
  - Input handling and validation.
  - UI state and API request lifecycle (loading/errors/retries).
  - Result rendering, filtering controls, and randomization controls.
  - Optional URL state (shareable search/filter links).

### Backend (service)

- Stack: `FastAPI + requests + BeautifulSoup4`.
- Host: Render/Railway/Fly.
- Responsibilities:
  - Fetch nonce and call KoG API (`api.php`) safely.
  - Decode nested KoG response payloads.
  - Scrape map catalog metadata from KoG maps page.
  - Compute intersections and random selections.
  - Serve frontend-ready JSON with normalized schema.

### Data flow

1. Browser calls backend endpoints.
2. Backend fetches KoG player data (`type=players`).
3. Backend refreshes/reads map catalog cache.
4. Backend computes `unfinished` intersection and applies filters.
5. Backend returns normalized response.

## 3) Core backend services

### A. KoG API client

- Endpoint: `https://kog.tw/api.php`.
- Supports:
  - Fresh nonce request per API call (`api.php?type=csrf-token`).
  - Automatic nonce injection.
  - Single-use nonce behavior.
  - JSON decoding for `data` when returned as JSON string.
- Resilience:
  - Retry once for empty body scenarios.
  - Optional Playwright bootstrap fallback for cloudflare/session cookies (disabled by default for production simplicity).
  - Env-based cookie injection for `cf_clearance` and `PHPSESSID`.

### B. Map catalog scraper

- Source: `https://kog.tw/get.php?p=maps`.
- Parse each map card into:
  - `name`
  - `difficulty` (`Easy`, `Main`, `Hard`, `Insane`, `Extreme`, ...)
  - `stars` (1-5)
  - `points`
  - `author`
  - `released_at`
- Cache policy:
  - In-memory TTL (default 6h).
  - Force refresh endpoint flag.

### C. Team planner service

- Input: list of players + optional filters.
- Steps:
  1. Fetch each player's `unfinishedMaps` set.
  2. Intersect sets for common unfinished.
  3. Join with catalog metadata.
  4. Filter by difficulty/stars.
  5. Sort + compute summary counts.
  6. Optionally random sample from final pool.

## 4) API contract (frontend-facing)

### `GET /health`

- Returns status + diagnostics flags.

### `GET /api/player/{player_name}`

- Returns normalized player data:
  - points summary
  - unfinished maps list
  - finished maps list
  - chart data (`points_over_time`)

### `GET /api/maps/catalog`

- Returns map metadata list.
- Query:
  - `refresh=true|false` (default false)

### `POST /api/team/common`

- Body:

```json
{
  "players": ["player1", "player2", "player3"],
  "difficulty": "Extreme",
  "stars": 2,
  "delimiter": ","
}
```

- Also supports raw `players_text` + `delimiter` parsing.

### `POST /api/team/random`

- Body extends `/api/team/common` with:
  - `count` (default 1)
  - `seed` (optional)

- Returns random picks from filtered common set.

## 5) Frontend UX plan (Material minimal, modern)

### IA and screens

- Single-page app with two tabs:
  - `Player Lookup`
  - `Team Planner`

### Player Lookup

- Input field + action button.
- Summary cards:
  - Rank
  - Total points
  - PvP points
  - Completed vs unfinished maps
- Expandable sections:
  - Unfinished maps table
  - Recent teammates
  - Points-over-time chart (line)

### Team Planner

- Multi-name input (`textarea`) + delimiter field.
- Filter controls:
  - Difficulty select
  - Stars select (Any/1..5)
  - Random count
  - Optional seed
- Actions:
  - `Find Common Unfinished`
  - `Random Pick`
- Results:
  - Common list table with metadata chips.
  - Random picks panel.
  - Copy/export to JSON/CSV (phase 2).

### UI patterns

- Material style with soft elevation and compact spacing.
- Strong information hierarchy:
  - Inputs top, results below.
  - Sticky actions on mobile.
- Accessibility:
  - Keyboard focus states.
  - Color contrast compliant palettes.
  - ARIA labels on controls.

## 6) Error handling and resilience

- Backend maps known failure classes to clear API errors:
  - KoG unavailable
  - Cloudflare/session blocked
  - Invalid player or no data
  - Partial team failure
- Frontend shows contextual recovery actions:
  - Retry
  - Remove invalid player from team list
  - Show available partial results when possible

## 7) Security and operational considerations

- CORS allowlist only for expected frontend domains.
- Rate limiting (phase 2 if needed).
- Basic request logging and timing metrics.
- No secrets in frontend.
- Cookies/session values only in backend env vars.

## 8) Deployment model

### Frontend (GitHub Pages)

- Build on push via GitHub Actions.
- Deploy `dist/` to Pages.
- API base URL from `VITE_API_BASE_URL`.

### Backend (Render recommended)

- Python web service.
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Env vars:
  - `CORS_ORIGINS`
  - `KOG_CF_CLEARANCE` (optional)
  - `KOG_PHPSESSID` (optional)
  - `MAP_CACHE_TTL_SECONDS`

## 9) Delivery phases

### Phase 1 (now)

- Backend endpoints + core logic.
- Frontend shell + working Player + Team flows.
- Basic caching and robust error states.

### Phase 2

- CSV export, favorites, URL state, usage analytics.
- Better charting and map detail views.

### Phase 3

- Auth/profile presets, shared team links, background refresh.

## 10) Acceptance criteria

1. User can look up any player and view normalized data in UI.
2. Team input with custom delimiter works.
3. Common unfinished list is computed correctly.
4. Filtering by difficulty and stars works.
5. Random generation from filtered common set works deterministically with seed.
6. Frontend runs from GitHub Pages, backed by deployed backend API.
