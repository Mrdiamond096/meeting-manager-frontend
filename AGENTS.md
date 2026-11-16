# AGENTS.md — meeting-manager-frontend

Rules for AI agents. Roles (v4): **Claude** owns this repo, including `README.md` and `.github/**`; **Codex** reviews every PR (README included) and owns umbrella docs; **Cursor** owns the backend.
Full brief: umbrella repo `docs/discussion/finally/ai-collaboration.md`.

## Stack
Next.js 15 App Router (standalone) · React 19 · TypeScript · Tailwind 4 + shadcn-style components · TanStack Query · React Hook Form + Zod 3 · Vitest + Testing Library (jsdom).

## Read before coding or reviewing
- Umbrella: `docs/design/DESIGN_GUIDELINES.md`, `docs/design/screens/*.png`, ADR-010/011/013/014, `backend/docs/api-contract.md`.
- Figma file `umgd40A9k9R8M2zhtk0Coj`, page `03 Screens` (S1–S11).

## Structure
```
src/
  middleware.ts            nonce CSP per request + redirect to /login without the sid cookie (UX only)
  app/layout.tsx           fonts, locale, nonce → Providers
  app/providers.tsx        QueryClient (401 → /login?next=), i18n, toaster
  app/(auth)/*             login, verify, register, forgot-password, reset-password
  app/(app)/*              signed-in pages (dashboard, meetings, candidates)
  features/<domain>/       api.ts · schemas.ts · components/* · hooks (pages stay thin)
  components/ui/*          shared primitives (button, input, card, badge, dialog, alert, toast…)
  components/shell/*       header, logo, current user
  i18n/                    EN/TH dictionaries (cookie `lang`), server + client helpers
  lib/                     api.ts (ApiError), csp.ts, routes.ts, cn.ts
  test/                    render helper (providers + router mock), setup
```

## Rules
- All HTTP through `src/lib/api.ts` (same-origin `/api/v1`, ADR-011). No Route Handlers or Server Actions touching data.
- Nonce CSP must not be weakened: no inline `<script>`/`style=` from libraries, no `dangerouslySetInnerHTML`, no `next/image` (inline style). Runtime `<style>` tags get the nonce via `get-nonce`.
- Design tokens only (no hex in components). Every page: loading, empty, error (show requestId). 409 → conflict dialog with Reload.
- Every user-visible string in both `en` and `th` dictionaries. Dates via `Intl` in the browser timezone (TH: Buddhist calendar, 24h).
- Never put emails or tokens in URLs; `?next` only same-app paths (`safeNext`).
- Done = `npm run typecheck && npm test && npm run build`; Conventional Commits in English (`feat(web): ...`); PR ≤ ~400 non-test lines.
