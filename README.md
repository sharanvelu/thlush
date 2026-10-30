# Thlush

Billing and point-of-sale for restaurants, cafés and small shops. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM and Neon Postgres.

**Status:** all 8 milestones done (reports, accessibility pass and docs added in milestone 8). See [Roadmap](#roadmap).

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
| `npm run check`       | Lint, type check and tests in one go. Run before pushing.            |
| `npm run db:generate` | Generate a new SQL migration in `drizzle/` after editing the schema. |
| `npm run db:migrate`  | Apply pending migrations to `DATABASE_URL`.                          |
| `npm run db:seed`     | Load demo data. Refuses to run in `production` unless `--force`.     |
| `npm run db:studio`   | Browse the database in Drizzle Studio.                               |

### Pull request checks

`.github/workflows/pr-checks.yml` runs on every pull request (and on pushes to `main` and `thlush-v2`): the PR title must follow Conventional Commits, then lint, type check, unit tests, a migration drift check (the schema must not differ from the committed `drizzle/` files; run `npm run db:generate` and commit if it fails) and a production build. It needs no secrets or database. To block merging on failures, mark **PR title (Conventional Commits)** and **Lint, types, tests, build** as required checks in the branch protection rules.

The seed is safe to re-run: users, categories, items and settings are only inserted when missing, and demo bills are only created when there are none.

## Deploying to Vercel

1. **Database.** In Neon, use a separate project or branch for production. Copy its connection string (with `sslmode=require`).
2. **Import the repo.** In Vercel choose **Add New, Project**, pick `sharanvelu/thlush` and keep the detected Next.js settings. Set the production branch to `main`.
3. **Environment variables** (Project Settings, Environment Variables):

   | Variable | Production | Preview |
   | -------- | ---------- | ------- |
   | `DATABASE_URL` | production Neon URL | a separate Neon branch, never the production URL |
   | `AUTH_SECRET` | a fresh `openssl rand -base64 32` | a different secret |
   | `NEXT_PUBLIC_BASE_URL` | your public URL, e.g. `https://pos.example.com` | the preview URL, or the same placeholder |
   | `NEXT_PUBLIC_APP_ENV` | `production` | `staging` |
   | `OIDC_*` | optional, see above | optional |

   `NEXT_PUBLIC_*` values are baked in at build time, so set them before the first deploy and redeploy after changing them. You do not need `AUTH_TRUST_HOST` on Vercel.
4. **Create the tables.** Migrations are not run by the build. From your machine, once per database and again after any new file appears in `drizzle/`:

   ```bash
   DATABASE_URL='<that environment's URL>' npm run db:migrate
   ```

   Do this before the deploy that needs the new schema.
5. **First admin.** The seed refuses to run against a production environment unless forced. To load the demo users (and demo data) into a new database:

   ```bash
   DATABASE_URL='<production URL>' NEXT_PUBLIC_APP_ENV=production npm run db:seed -- --force
   ```

   Then sign in as `admin@thlush.local`, change the password, and delete the demo users in **Users & Roles**. Never leave the default `Password@123` on a public deployment. Set `SEED_PASSWORD` in that command to use a different one from the start.
6. **Deploy.** Push to `main`. Every pull request also gets a preview deployment.
7. **Check it.** Sign in, open **Reports** and download a PDF, and print a receipt. PDF export uses `pdfkit`, which reads font files at run time, so confirm it once on the first deployment.

**Region.** Set the function region (Project Settings, Functions) close to your Neon region to keep queries fast.

**Sharing previews.** Vercel protects previews by default, so only people signed in to your Vercel team can open them. To share one with reviewers, open Project Settings, Deployment Protection and change **Vercel Authentication**. Preview deployments then need no Vercel login, but anyone with the URL can open the app, so keep preview data fake and never point previews at the production database.

**Custom domain.** Add it under Domains, then update `NEXT_PUBLIC_BASE_URL` and redeploy. If you use SSO, add `<your URL>/api/auth/callback/oidc` as a redirect URI at the identity provider.

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

## Bill History

`/bills` lists bills with server-side paging. Filters (all in the URL, so views can be shared): date range in the business timezone, customer, item, min and max total, payment method, status and cashier. Held bills are hidden unless you filter for them. Sort by date, total or customer.

- **Who sees what:** cashiers only ever get their own bills, even if they ask for someone else's. Managers and admins see all and can void or refund.
- **Void or refund:** needs a reason. One transaction marks the bill, records who and why, writes the audit entry, and puts back exactly the stock that bill's sale deducted (read from the stock ledger). A bill can only be reversed once.
- **Export:** CSV and XLSX follow the active filters, one row per bill line: Bill ID, Date, Customer, Item, Qty, Currency, Price (before tax), Tax, Total, plus Status so voided bills are not mistaken for sales. XLSX amounts are real numbers. Exports stop at 10,000 bills (the response header `X-Export-Truncated` says when).
- **Revenue** in the summary line counts completed bills only.

## Dashboard

`/` shows a date range (Today, 7 days, 30 days or a custom range, kept in the URL) with:

- **KPI cards** for bills, revenue, average order value and items sold, each compared with the period of equal length just before it ("New" when there is nothing to compare).
- **Charts:** revenue (by hour for a single day, otherwise by day), bills per hour, sales by category (each category keeps its own colour) and payment methods.
- **Top 5 items**, **low stock** (tracked items at or under their reorder level, shown only to roles that can see inventory) and **recent bills**.

Only completed bills count as sales. Days and hours follow the business timezone from settings. Cashiers see figures for their own bills only. Every chart has a data table for screen readers.

## Customers

`/customers` lists name, contact, orders, lifetime spend and last visit (completed bills only), with search (name, phone, email, tag) and sorting. The detail page shows the profile, stats and that customer's bills. Deleting a customer keeps their bills, which then show as walk-in. A phone number can belong to one customer. Typing a new name on the billing screen creates the customer once and reuses them next time.

## Admin

- **Users & Roles** (super admin only): add, edit, reset a password, change a role, delete. You can't delete yourself or change your own role, and the last super admin can't be removed or demoted. Passwords are hashed with bcrypt and need 8+ characters with a letter and a number. SSO accounts have no password and their name and email come from the identity provider.
- **Audit log** (super admin and manager): who did what and when, filterable by user, record type, action and date. It records sign-ins, menu and category changes, bills, voids, stock, users and settings. Passwords are never written to it.
- **Settings** (super admin only), saved one section at a time with an audit entry for each: business profile and logo, currency, locale and time zone, tax, receipt text and paper width, bill number prefix and digits, accent colour (live preview, auto-picked readable text, AA contrast check) and feature toggles. Turning Inventory off hides its navigation; Discounts and Order types hide those controls on the billing screen.
- **Profile**: everyone can edit their own name and email, change their password (not for SSO accounts) and save a theme that follows them to other devices.

## Inventory

Switch it on in Settings. Stock is only counted for items with **Track stock** turned on in the menu form (unit, reorder level, cost price and opening stock live there too). Turning the feature off stops stock being deducted or checked at billing.

- **Stock Overview** (`/inventory`): tracked items, stock value at cost, low and out-of-stock counts, with search, category and status filters and sorting.
- **Stock Adjustments**: add or remove stock with a reason (purchase, wastage, damage, correction, return). Removing more than is on hand is refused. Every change, including sales, voids and refunds, lands in an append-only ledger with the balance after it.
- **Suppliers & Purchases** (`/inventory/suppliers`): receiving a delivery adds stock, updates each item's cost price and writes ledger rows in one transaction. Deleting a supplier keeps its past purchases.
- **Alerts**: the bell in the top bar and the dashboard list items at or under their reorder level.

## Reports

`/reports` (super admin and manager) has nine reports. Each has a chart, a table with totals, and CSV and PDF export that uses the same query as the page, so the file always matches the screen.

| Report | What it shows |
| ------ | ------------- |
| Sales | Bills, items, subtotal, discount, tax and total per day, week or month |
| By category / item / cashier / payment | Quantity, revenue and share for each, best first |
| Tax | SGST and CGST collected per tax rate, reconciling to the bill totals |
| Discounts | Every discounted bill with its cashier and percentage of subtotal |
| Stock value | Tracked items valued at cost (a snapshot of today, so no date range) |
| Stock movement | Received, sold, wasted and corrected quantities per item |

The date range defaults to the last 30 days (Today, 7 days, 30 days or a custom range up to a year) and lives in the URL, so a view can be bookmarked. Figures count completed bills only; void, refunded and held bills are not sales. Tables stop at 500 rows and say so; narrow the range to see the rest. CSV files contain plain numbers and neutralise spreadsheet formulas. PDFs print amounts without a currency symbol (the built-in PDF fonts have no rupee glyph) and state the currency in the header. The two stock reports are hidden when Inventory is off.

## Accessibility

Targets WCAG 2.1 AA. Every page has one `h1`, a skip link and a `main` landmark; form fields have labels and inline error text; charts have a text summary and the same numbers in the table beside them; tables use real header cells; focus rings are visible; light and dark themes keep AA contrast (the accent colour setting checks this and picks readable text); motion respects `prefers-reduced-motion`; no page scrolls sideways at 390px. A scripted check of 17 pages for missing names, labels, duplicate ids and landmarks is clean.

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
| Bill History: filters, sort, CSV/XLSX export, reprint, void and refund with restock | 4 (done) |
| Dashboard: KPIs with trends, revenue, hourly, category and payment charts, top items, low stock | 5 (done) |
| Customers, Users & Roles, Audit log, Settings, Profile | 6 (done) |
| Inventory: stock, movements, alerts, suppliers | 7 (done) |
| Reports, accessibility pass, docs      | 8 (done) |

## Roadmap

All eight milestones are built. Not done: recipe and ingredient tracking (an optional stretch goal), and tax-inclusive pricing (prices are tax-exclusive by design). See [Deploying to Vercel](#deploying-to-vercel).
