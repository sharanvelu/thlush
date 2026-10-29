# Thlush

Billing and point-of-sale for restaurants, cafés and small shops. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM and Neon Postgres.

**Status:** milestone 3 of 8 done (POS billing, bill saving and receipts, on top of categories, menu and the foundation). See [Roadmap](#roadmap).

## Quick start

Requires Node 22 or newer (developed on Node 24) and a PostgreSQL database. Neon is the target.

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate          # create the tables
npm run db:seed             # demo users, menu and bills (optional)
npm run dev                 # http://localhost:3000
```

Demo logins after seeding (password `Password@123`, or whatever `SEED_PASSWORD` is):

| Role        | Email                  |
| ----------- | ---------------------- |
| Super admin | `admin@thlush.local`   |
| Manager     | `manager@thlush.local` |
| Cashier     | `cashier@thlush.local` |

The login page offers these as one-click fill-ins, but only when `NEXT_PUBLIC_APP_ENV=local`.

## Environment variables

| Variable                                            | Required | Purpose                                                              |
| --------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL`                                      | yes      | Postgres connection string.                                          |
| `AUTH_SECRET`                                       | yes      | Signs session cookies (`openssl rand -base64 32`).                   |
| `NEXT_PUBLIC_BASE_URL`                              | yes      | Public URL of the app.                                               |
| `NEXT_PUBLIC_APP_ENV`                               | yes      | `local`, `staging` or `production`. Controls the demo-login helper.  |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | no     | Set all three to enable "Sign in with SSO". Works with Authentik and Keycloak. |
| `AUTH_TRUST_HOST`                                   | no       | Set to `true` when self-hosting. Without it Auth.js rejects the host in production. |
| `DB_TABLE_PREFIX`                                   | no       | Table-name prefix, default `app_`.                                   |
| `SEED_PASSWORD`                                     | no       | Password for seeded demo users.                                      |

SSO users are created on first sign-in with the least-privileged role (cashier). An SSO email must be verified by the identity provider, and it links to an existing account with the same email.

## Scripts

| Command               | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server.                                                |
| `npm run build`       | Production build.                                                    |
| `npm run lint`        | ESLint (no `any` allowed).                                           |
| `npm run typecheck`   | TypeScript in strict mode.                                           |
| `npm test`            | Vitest unit tests.                                                   |
| `npm run db:generate` | Generate a new SQL migration in `drizzle/` after editing the schema. |
| `npm run db:migrate`  | Apply pending migrations to `DATABASE_URL`.                          |
| `npm run db:seed`     | Load demo data. Refuses to run in `production` unless `--force`.     |
| `npm run db:studio`   | Browse the database in Drizzle Studio.                               |

The seed is safe to re-run: users, categories, items and settings are only inserted when missing, and demo bills are only created when there are none.

## Billing screen

`/billing` is a two-pane POS: items on the left (search, category chips, grid or list), the bill on the right. On phones the bill opens from a bar at the bottom.

| Shortcut                 | Action                                           |
| ------------------------ | ------------------------------------------------ |
| `/`                      | Focus the search box                             |
| `Enter` in search        | Add the exact SKU match, or the only result      |
| `Esc` in search          | Clear the search                                 |
| `Ctrl/⌘ + Enter`         | Save bill                                        |
| `Ctrl/⌘ + Shift + Enter` | Save and print                                   |
| `Alt + H`                | Hold bill                                        |
| `Alt + Backspace`        | Clear the bill                                   |

How a bill is saved:

- The browser sends only item ids, quantities, discounts and payments. The server prices everything from the catalog (`src/services/bill-plan.ts`), so a stale or tampered client cannot change what is billed.
- One transaction writes the customer, bill, lines (a snapshot of name, price and tax), payments, stock movements and the audit entry. Any failure rolls all of it back.
- Bill numbers are `{prefix}{YYYYMMDD}-{seq}` in the business timezone, taken under a per-day lock so they are unique and gap-free. Held bills carry a temporary number and get the real one when finished.
- Each save carries a client reference. Pressing Save twice, or retrying after a dropped connection, returns the same bill.
- Tracked items are locked and deducted in the same transaction. Turn on "block out of stock" in settings to refuse overselling.

Rounding: tax is rounded half-up to 2 decimals per component (SGST, CGST) per line, and totals are sums of the rounded lines, so every figure on a bill reconciles to the paisa.

Receipts: `/receipt/{id}` is the printable page (`@page size: 80mm auto`, or 58mm from settings). `/api/bills/{id}/pdf` returns the same receipt as a narrow PDF; amounts there are plain numbers and the total names the currency code, because the PDF's built-in fonts have no rupee sign. WhatsApp and email links carry a plain-text copy of the receipt.

## Architecture

```
src/
  app/            Routes. (auth)/login, (app)/* behind the shell, api/*
  components/     ui/ (shadcn), layout/ (shell), auth/, theme/, dashboard/
  config.ts       App settings and default business settings
  config/         permissions.ts (the role matrix), navigation.ts, demo.ts
  db/             Drizzle client and one schema file per table
  lib/            api envelope + withAuth, money, errors, password, formatting
  services/       All business logic (users, audit, settings, calculations)
  types/          Shared types
drizzle/          Generated, ordered SQL migrations
scripts/          migrate.ts and seed.ts
tests/            Vitest tests
```

**Rules the code follows**

- Business logic lives in `src/services`. Routes and components stay thin.
- Every API route is wrapped in `withAuth` and answers with `{ success: true, data, pagination? }` or `{ success: false, error }`.
- Input is validated with Zod on the client and the server.
- Money is `numeric` in Postgres and `Decimal` in code. Never floats. See `src/lib/money.ts` and the rules at the top of `src/services/calculations.ts`.
- The permission matrix lives in one file, `src/config/permissions.ts`. The proxy, API routes, server pages and the sidebar all read from it.

### Roles

| Capability                        | Super admin | Manager | Cashier  |
| --------------------------------- | :---------: | :-----: | :------: |
| Dashboard, New Bill, Customers    | yes         | yes     | yes      |
| Bill History                      | all bills   | all     | own only |
| Menu                              | manage      | manage  | read     |
| Categories, Inventory, Reports    | yes         | yes     | no       |
| Void / refund bills               | yes         | yes     | no       |
| Audit log                         | yes         | yes     | no       |
| Users & roles, Settings           | yes         | no      | no       |

Access is enforced in three places. The proxy (`src/proxy.ts`) does a coarse check from the session token. Server pages and `withAuth` re-read the user from the database on every request, so a revoked role or deleted account takes effect immediately. The sidebar hides what a role cannot open. Newly granted access reaches the proxy after the user signs in again.

### Database

Tables use the `app_` prefix: `users`, `categories`, `menu_items`, `customers`, `bills`, `bill_items`, `payments`, `stock_movements`, `suppliers`, `purchases`, `purchase_items`, `audit_logs`, `settings`. Ids are `bigint identity` (users use `uuid`) and timestamps are `timestamptz`. Bill lines store a snapshot of name, price and tax, so menu edits never change old bills.

## Features

| Area                                   | Milestone |
| -------------------------------------- | :-------: |
| Auth (password + optional SSO), roles, sidebar shell, theme, command palette | 1 (done) |
| Categories (drag to reorder, block-delete) and Menu CRUD: table/grid, filters, bulk actions, photos, variants, CSV import/export | 2 (done) |
| POS billing, bill saving, thermal receipts, PDF, WhatsApp/email sharing | 3 (done) |
| Bill History: filters, sort, export, reprint, void | 4 |
| Dashboard and charts                   | 5 |
| Customers, Users, Audit log, Settings  | 6 |
| Inventory: stock, movements, alerts, suppliers | 7 |
| Reports, accessibility pass, docs      | 8 |

## Roadmap

Built in milestones, each reviewed before the next begins. The sidebar already lists every page; pages that arrive later show a placeholder that still enforces permissions.
