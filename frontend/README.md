# Frontend (KoG Team Planner)

React + TypeScript + MUI frontend for:

- Player lookup
- Team common unfinished maps
- Random picks from filtered common maps
- Shareable URL state for team filters/inputs
- CSV export and copy actions
- OAuth sign-in (Google / Discord) + profile KoG name support

## Commands

```bash
npm install
npm run dev
npm run build
```

## Environment

Copy `.env.example` to `.env`:

- `VITE_API_BASE_URL` -> backend API URL
- `VITE_BASE_PATH` -> `/` or `/<repo-name>/` for GitHub Pages project repos

Auth is fully backend-driven via redirects from `/api/auth/*`.
