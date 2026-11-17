# meeting-manager-frontend

Next.js 15 (App Router, React 19) UI for Meeting Manager, built with Tailwind 4, TanStack Query, Radix,
react-hook-form and Zod. It runs on its own against any backend, or as the `frontend/` submodule of
[meeting-manager](https://github.com/Mrdiamond096/meeting-manager), which starts the API, the database and this app
together. The full stack is the easiest way to try it.

## Quick start

The UI needs the API ([meeting-manager-backend](https://github.com/Mrdiamond096/meeting-manager-backend)) running
on `:3000`. In the backend repo:

```bash
make up && docker compose exec api npm run db:seed
```

Then, in this repo:

```bash
make up    # Next.js dev server in Docker → http://localhost:3001
```

Log in as `demo@example.com` / `demo-password-123`, with OTP `112233` (the backend's mock OTP; see the backend README).

### Local Node

Needs Node 24 (`.nvmrc`).

```bash
nvm use
npm install
npm run dev    # http://localhost:3001, proxies /api to API_URL (default http://localhost:3000)
```

The backend allows `http://localhost:3001` as an origin by default (`ALLOWED_ORIGINS`). If you serve the UI from
another origin, add that origin there.

## How it talks to the API

The browser only calls its own origin. Next rewrites `/api/*` to `API_URL` (`next.config.ts`), so the session cookie
stays first-party and no CORS is needed. The API owns authentication. `src/middleware.ts` only sends a visitor
without the session cookie to `/login`, and sets a per-request nonce Content-Security-Policy.

| Variable | Default | Notes |
|---|---|---|
| `API_URL` | `http://localhost:3000` | Backend base URL for the `/api` rewrite. Docker dev: `http://host.docker.internal:3000` (standalone compose) or `http://api:3000` (umbrella). **Read at build time**: for the production image, pass `--build-arg API_URL=…` |
| `PORT` | `3001` dev (`package.json`), `3000` in the prod image | |

There are no other variables and no secrets: all configuration lives on the API.

## Features

- Auth: register, login, OTP verify (with autofill), forgot and reset password.
- Dashboard: list with status and "mine" filters and paging, or a calendar (week or month, Monday first) with an
  event popover. Click an empty slot to create a meeting there. On phones the week shows as a day agenda.
- Create and edit meetings, including an inline new candidate. Optimistic versioning: a 409 asks you to reload.
- Candidate summary: upcoming meetings, history, feedback, plus cancel and delete.
- English and Thai (language switch, stored in a cookie), and light, dark and system themes.

Times show in the browser's timezone. The calendar renders only in the browser, so the server never guesses a zone.

## Tests

```bash
make test           # or: npm test
make test-docker    # inside the web container
npm run typecheck
```

Vitest + Testing Library on jsdom, with `fetch` mocked: no backend needed. `*.forks.test.*` files change process-wide
state (such as `TZ`, for daylight-saving cases) and run in a separate `forks` project. On a slow or busy machine,
`npx vitest run --no-file-parallelism` avoids timeouts.

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm audit --audit-level=high`, typecheck, tests, the build, and then
the production Docker image. Dependabot proposes npm, Actions and Docker updates weekly.

## Production image

```bash
docker build --target prod --build-arg API_URL=http://api:3000 -t meeting-web .
docker run -p 3000:3000 meeting-web
```

Next `standalone` output, run as `node`.

## Layout

```
src/
  app/                (auth)/ login, register, verify, forgot/reset · (app)/ dashboard, meetings, candidates
  features/<area>/    auth, meetings, calendar, candidates: api.ts, components/, schemas, helpers + tests
  components/ui/      shared primitives (button, dialog, popover, …) · components/shell/ header, theme, language
  i18n/               en/th dictionaries
  lib/                API client, routes, CSP
  middleware.ts       login redirect + CSP nonce
  test/               test setup and render helpers
```
