<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Thlush: start here

Thlush is billing and point-of-sale for restaurants, cafés and small shops: a staff POS plus a public customer menu, in one Next.js app. Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, Neon Postgres, Auth.js.

You do not need to read the whole codebase. Read in this order, then start:

1. **Skills first.** Open [docs/SKILLS.md](docs/SKILLS.md), check which listed skills are installed, and **install the missing required ones before writing any code.**
2. [ARCHITECTURE.md](ARCHITECTURE.md): structure, layering, auth, database, key flows, and a "where to put new things" table.
3. [STYLE.md](STYLE.md): code, commit and UI conventions, including light/dark theming.
4. [README.md](README.md): setup, env vars, scripts, deployment and feature behaviour.
5. [CLAUDE.md](CLAUDE.md): hard project rules.

## Setup in four commands

```bash
npm install
cp .env.example .env     # fill DATABASE_URL (Neon) and AUTH_SECRET
npm run db:migrate && npm run db:seed
npm run dev              # http://localhost:3000, sign in as admin@thlush.local / Password@123
```

Run `npm run check` (lint, formatting, typecheck, tests) before saying work is done, and `npm run build` for UI or routing changes. CI runs the same plus a migration drift check.

## Rules that are easy to get wrong

- Follow the existing pattern instead of picking your own. API routes use `withAuth`; logic goes in `src/services`; validation in `src/lib/validation`; permissions only in `src/config/permissions.ts`.
- Money goes through `src/lib/money.ts` (Decimal), never JS numbers.
- Tables go through `table()` (prefix `app_`). After any schema change run `npm run db:generate` and commit the SQL.
- Anything that changes menu items, categories or prices must call `invalidatePosCatalog()`.
- UI uses theme tokens only and must work in light and dark. Customer pages (`src/app/(customer)`, `src/components/customer`) follow the extra rules in CLAUDE.md.
- Never edit `.env`, commit secrets, or touch a shared or production database. Use a Neon branch for experiments; the seed refuses to run in `production`.
- Don't commit, push, or create branches unless the user asks. Commit messages and PR titles are Conventional Commits (`feat:`, `fix(scope):`, `docs:` ...).
- Never weaken, skip or rename a required CI check (see "Pull request checks" in the README and `docs/GITHUB-SECURITY.md`), and pin any new GitHub Action to a full commit SHA.
- Docs are part of the change: see the table below.

## Keep the docs in step with every change

Every change you make must update the docs in the same change (same commit or PR). A change is not done until its docs are. Put each update in the file that owns it:

| If you changed...                                                      | Update                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Setup, scripts, env vars, deployment, or what a feature does for users | `README.md` (and `.env.example` + `src/env.ts` for env vars)           |
| Structure, layering, tables, permissions, key flows, where code goes   | `ARCHITECTURE.md` (and the roles table in `README.md` for permissions) |
| A code, commit or UI convention, theming, accessibility rule           | `STYLE.md`                                                             |
| A hard project rule or the agent workflow                              | `CLAUDE.md` / `AGENTS.md`                                              |
| The skills the project relies on                                       | `docs/SKILLS.md`                                                       |
| A planned feature's design                                             | the matching file in `docs/`                                           |

If nothing in the docs is affected, say so in the PR description.
