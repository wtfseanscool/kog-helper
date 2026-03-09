# Next Steps Plan (Phase 1.1)

## Scope

This phase implements three immediate improvements:

1. Automate frontend deployment to GitHub Pages.
2. Add backend deployment configuration for Render and Railway.
3. Improve Team Planner with CSV export, copy map list, and shareable URL state.

## 1) GitHub Pages automation

- Add a workflow that builds `frontend/` on push to `main`.
- Compute `VITE_BASE_PATH` automatically:
  - `/` for `<owner>.github.io`
  - `/<repo>/` for project pages
- Require repository variable `VITE_API_BASE_URL` for production API endpoint.
- Publish with official `actions/upload-pages-artifact` + `actions/deploy-pages`.

## 2) Backend deployment config

- Add `render.yaml` with `rootDir: backend`, build/start commands, healthcheck, and env var placeholders.
- Add Railway config (`backend/railway.json`) and `backend/Procfile`.
- Update docs with exact settings and env var checklist.

## 3) Team planner UX enhancements

- Add utility actions to results panel:
  - Export filtered maps to CSV.
  - Copy filtered map names to clipboard.
  - Copy share link.
- Add shareable URL state:
  - Persist `tab`, `players`, `delimiter`, `difficulty`, `stars`, `randomCount`, `seed`, and metadata toggle.
  - Restore UI state from URL on page load.

## Validation

- Run frontend lint/build.
- Smoke test backend endpoints.
- Verify share link can restore Team Planner state.
