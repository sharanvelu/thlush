# Thlush

Billing and point-of-sale for restaurants, cafés and small shops. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM and Neon Postgres.

**Status:** all 8 milestones done (reports, accessibility pass and docs added in milestone 8). See [Roadmap](#roadmap).

## Docs for developers and code agents

| File                                                                   | What it is for                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                 | Start here. Reading order, setup, and the rules that are easy to get wrong.       |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                     | Stack, directory map, layering, auth, database, key flows, where to put new code. |
| [STYLE.md](STYLE.md)                                                   | Code, commit and UI conventions, theming and accessibility.                       |
| [CLAUDE.md](CLAUDE.md)                                                 | Hard project rules for Claude Code (imports AGENTS.md).                           |
| [docs/SKILLS.md](docs/SKILLS.md)                                       | Agent skills to install before implementing.                                      |
| [docs/online-orders-integration.md](docs/online-orders-integration.md) | Draft design for Swiggy/Zomato orders. Nothing built.                             |

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

| Variable                                                                          | Required | Purpose                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                    | yes      | Postgres connection string.                                                                                                                                                                                                   |
| `AUTH_SECRET`                                                                     | yes      | Signs session cookies (`openssl rand -base64 32`).                                                                                                                                                                            |
| `NEXT_PUBLIC_BASE_URL`                                                            | yes      | Public URL of the app.                                                                                                                                                                                                        |
| `NEXT_PUBLIC_APP_ENV`                                                             | yes      | `local`, `staging` or `production`. The seed refuses to run in production.                                                                                                                                                    |
| `APP_DOMAIN_POS`, `APP_DOMAIN_CUSTOMER`                                           | no       | Hostnames (no `https://`) for the staff app and the customer site, both added as domains on the one Vercel project. Leave empty for local development. When set, any other host (including `*.vercel.app`) gets an empty 404. |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`                             | no       | Set all three to enable "Sign in with SSO". Works with Authentik and Keycloak.                                                                                                                                                |
| `AUTH_TRUST_HOST`                                                                 | no       | Set to `true` when self-hosting. Without it Auth.js rejects the host in production.                                                                                                                                           |
| `DB_TABLE_PREFIX`                                                                 | no       | Table-name prefix, default `app_`.                                                                                                                                                                                            |
| `SEED_PASSWORD`                                                                   | no       | Password for seeded demo users.                                                                                                                                                                                               |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | no       | Neon Object Storage credentials for menu photos. Filled in by `neon deploy` / `neon env pull`.                                                                                                                                |
| `OBJECT_STORAGE_BUCKET`                                                           | no       | Bucket for menu photos, default `uploads` (declared in `neon.ts`).                                                                                                                                                            |
| `NEXT_PUBLIC_PRINT_AGENT_URL`                                                     | no       | Where the optional print agent listens, default `http://127.0.0.1:9101`.                                                                                                                                                      |

**Menu photos.** Photos are stored in a Neon Object Storage bucket (`src/lib/object-storage.ts`); the database keeps a reference like `s3:menu/<uuid>.webp`. When the `AWS_*` credentials are not set (a plain local database), new photos stay in the database as data URLs, and older `data:` or `https://` values keep working. The customer menu serves photos through `/api/c/menu/[id]/image`, only for items that are on the public menu.

**Logging out of SSO.** With SSO configured, **Settings > Features > Single sign-on > When someone logs out** chooses what the Log out button does for people who signed in with SSO: **App only** (default), **App and SSO, in the background** (the user stays in the app, sees a logging-out loader while the browser sends the logout request to the provider, then lands on the sign-in page), or **App and SSO, via the provider** (the browser goes to the provider's logout page and back). For Authentik the background option runs the provider's logout flow through its API (the same way the older thlush-v1 did); for other providers it sends the standard logout request, which only works if the provider accepts its session cookie on a request from another site. A provider that does not leaves its session open without any error, so test it and use the redirect option if so. The user sees a full-screen "Logging out…" loader throughout. The redirect option needs `<your URL>/login` registered as a **post-logout redirect URI** at the provider. Both need a provider that publishes an `end_session_endpoint`; without one, logging out only ends the app session.

SSO users are created on first sign-in with the least-privileged role (cashier). An SSO email must be verified by the identity provider, and it links to an existing account with the same email.

## Scripts

| Command               | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server.                                                 |
| `npm run build`       | Production build.                                                     |
| `npm run lint`        | ESLint (no `any` allowed).                                            |
| `npm run typecheck`   | TypeScript in strict mode.                                            |
| `npm test`            | Vitest unit tests.                                                    |
| `npm run print-agent` | Local agent that sends receipts to the thermal printer (see below).   |
| `npm run format`      | Format everything with Prettier (CI runs `format:check`).             |
| `npm run check`       | Lint, formatting, type check and tests in one go. Run before pushing. |
| `npm run db:generate` | Generate a new SQL migration in `drizzle/` after editing the schema.  |
| `npm run db:migrate`  | Apply pending migrations to `DATABASE_URL`.                           |
| `npm run db:seed`     | Load demo data. Refuses to run in `production` unless `--force`.      |
| `npm run db:studio`   | Browse the database in Drizzle Studio.                                |

### Pull request checks

Every pull request to `main` must pass these required checks (workflows in `.github/workflows/`, shared toolchain setup in `.github/actions/setup`). All of them are check-only: CI never rewrites code. None needs secrets or a database.

| Required check         | Workflow                  | What it enforces                                                                                                         |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `PR Title Lint`        | `pr-title.yml`            | PR title follows Conventional Commits (with squash-merge it becomes the commit message).                                 |
| `Code Style Gate`      | `code-style.yml`          | `eslint .` and `prettier --check .` (fix locally with `npm run format`).                                                 |
| `Static Analysis Gate` | `static-code-analyze.yml` | `npm run typecheck`; and, when `.github/**` changes, `actionlint` plus `zizmor` (workflow security audit).               |
| `Tests Gate`           | `tests.yml`               | `npm test` (Vitest).                                                                                                     |
| `Build Check Gate`     | `build-check.yml`         | Committed `drizzle/` migrations match the schema (run `npm run db:generate` and commit if not), then a production build. |
| `Dependency Review`    | `dependency-review.yml`   | Blocks new dependencies with known vulnerabilities of moderate severity or higher.                                       |

Only the `... Gate` jobs are required, because the jobs behind them are path-filtered and can be skipped legitimately. Also running, but not blocking: **CodeQL** (`codeql.yml`: on pushes to `main`, weekly, and on demand; findings appear under Security), **Dependabot** (`dependabot.yml`: weekly, grouped minor and patch updates titled `chore(deps): ...`; `dependabot-auto-merge.yml` turns on auto-merge for those once the required checks pass, majors stay manual), and a nightly **cleanup** of old workflow runs. `.github/CODEOWNERS` requests review from the owner. Third-party actions are pinned to full commit SHAs; keep them that way (Dependabot updates them). The branch and repository settings that make these checks mandatory are listed in [docs/GITHUB-SECURITY.md](docs/GITHUB-SECURITY.md).

Run the same checks locally with `npm run check` (lint, formatting, type check, tests).

The seed is safe to re-run: users, categories, items and settings are only inserted when missing, and demo bills are only created when there are none.

## Deploying to Vercel

1. **Database.** In Neon, use a separate project or branch for production. Copy its connection string (with `sslmode=require`).
2. **Import the repo.** In Vercel choose **Add New, Project**, pick `sharanvelu/thlush` and keep the detected Next.js settings. Set the production branch to `main`.
3. **Environment variables** (Project Settings, Environment Variables):

   | Variable               | Production                                      | Preview                                          |
   | ---------------------- | ----------------------------------------------- | ------------------------------------------------ |
   | `DATABASE_URL`         | production Neon URL                             | a separate Neon branch, never the production URL |
   | `AUTH_SECRET`          | a fresh `openssl rand -base64 32`               | a different secret                               |
   | `NEXT_PUBLIC_BASE_URL` | your public URL, e.g. `https://pos.example.com` | the preview URL, or the same placeholder         |
   | `NEXT_PUBLIC_APP_ENV`  | `production`                                    | `staging`                                        |
   | `OIDC_*`               | optional, see above                             | optional                                         |

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

**Region.** `vercel.json` runs the functions in `sin1` (Singapore), next to the Neon database in ap-southeast-1. Every page and API call makes several database round trips, so keeping the two close matters. If your database is in another region, change `regions` in `vercel.json` to the nearest Vercel region.

**Sharing previews.** Vercel protects previews by default, so only people signed in to your Vercel team can open them. To share one with reviewers, open Project Settings, Deployment Protection and change **Vercel Authentication**. Preview deployments then need no Vercel login, but anyone with the URL can open the app, so keep preview data fake and never point previews at the production database.

**Custom domain.** Add it under Domains, then update `NEXT_PUBLIC_BASE_URL` and redeploy. If you use SSO, add `<your URL>/api/auth/callback/oidc` as a redirect URI at the identity provider.

## Customer site (public menu)

A read-only menu for customers, served from the same app. On its own domain (`APP_DOMAIN_CUSTOMER`) the proxy rewrites every path under `/c`; with no domains set (local, previews) open `/c` or `/c/menu` directly. It shows active items in active categories, built from the same cached catalogue as the billing screen, and leaves out SKUs, tax, stock and packaging charges (`src/lib/customer-menu.ts`). The name and logo come from Settings. Edits to the menu show up straight away.

It supports light and dark: it follows the visitor's device until they choose Light, Dark or System with the toggle, saved in the browser under `customer-theme` (separate from the staff app's `theme`). Rules for building customer pages are in [STYLE.md](STYLE.md#customer-site).

## Billing screen

`/billing` is a two-pane POS: items on the left (search, category chips, grid or list), the bill on the right. On phones the bill opens from a bar at the bottom.

| Shortcut          | Action                                      |
| ----------------- | ------------------------------------------- |
| `/`               | Focus the search box                        |
| `Enter` in search | Add the exact SKU match, or the only result |
| `Esc` in search   | Clear the search                            |
| `Ctrl/⌘ + Enter`  | Save & print                                |
| `Alt + K`         | Send new items to the kitchen               |
| `Alt + H`         | Hold bill                                   |
| `Alt + Backspace` | Clear the bill                              |

How a bill is saved:

- The browser sends only item ids, quantities, discounts and payments. The server prices everything from the catalog (`src/services/bill-plan.ts`), so a stale or tampered client cannot change what is billed.
- One transaction writes the customer, bill, lines (a snapshot of name, price and tax), payments, stock movements and the audit entry. Any failure rolls all of it back.
- Bill numbers are `{prefix}{YYYYMMDD}-{seq}` in the business timezone, taken under a per-day lock so they are unique and gap-free. Held bills carry a temporary number and get the real one when finished.
- Each save carries a client reference. Pressing Save twice, or retrying after a dropped connection, returns the same bill.
- Tracked items are locked and deducted in the same transaction. Turn on "block out of stock" in settings to refuse overselling.

Rounding: tax is rounded half-up to 2 decimals per component (SGST, CGST) per line, and totals are sums of the rounded lines, so every figure on a bill reconciles to the paisa.

Receipts: `/receipt/{id}` is the printable page (`@page size: 80mm auto`, or 58mm from settings). `/api/bills/{id}/pdf` returns the same receipt as a narrow PDF; amounts there are plain numbers and the total names the currency code, because the PDF's built-in fonts have no rupee sign. WhatsApp and email links carry a plain-text copy of the receipt.

## Thermal printer (ESC/POS)

Receipts and kitchen slips print as raw ESC/POS bytes, so no printer driver is needed for printing and the paper is cut by the printer itself: a cut after the receipt, and another after the kitchen slip.

Kitchen slip: printed after the receipt when a new bill is saved (Save & print, and the print button on the "Bill saved" dialog). On by default; turn it off under **Settings > Receipts > Print kitchen bill by default**. In Bill History the **With kitchen slip** checkbox is off by default.

Packaging charge: give a menu item a **Packaging charge** (menu item form, under Pricing). Under **Settings > Billing > Packaging charge** choose the order types that get it (none turns it off), how it is counted (**per unit**: charge x quantity, with weighed items counted once per line; **per item line**: once per line; **once per bill**: one charge for the whole bill, the **Charge per bill** amount from Settings, which replaces the per-item charges and is taxed at the highest rates on the bill; at 0 the highest item charge is used) and whether it is taxed (at the item's SGST and CGST). It appears as its own "Packaging" line on the bill and receipt, and a bill discount never reduces it. It needs the `0003_packaging` migration (`npm run db:migrate`).

Running orders (customer orders in rounds): **Send to kitchen** (`Alt + K`) saves the bill as a held order and prints a kitchen slip with only the items the kitchen has not had yet ("KOT #1", "KOT #2"...). Resume the order from **Held bills**, add more, and send again. When the customer pays, **Save & print** prints the customer receipt, plus a kitchen slip only for anything never sent. **Hold bill** parks a bill without sending anything. Items already sent cannot be removed or reduced. This needs the `0002_bill_kots` migration (`npm run db:migrate`).

The server builds the bytes (`/api/bills/[id]/escpos`); the browser sends them to the printer the first way that works:

1. **Straight over USB (WebUSB)**. Nothing to install. Chrome or Edge only.
2. The optional local **print agent** (`npm run print-agent`, developer use).
3. The browser's print dialog, if neither is available.

### Custom Print page

`/thermal-print/custom` (sidebar: Tools, Custom Print) prints free text. Each **text field** is its own slip, and the printer cuts after every one; **Add text field** adds another. Each field has alignment, bold and large-text options, and empty fields are skipped. It uses the same print engine as bills (USB, the print agent, or the print dialog, following the computer's print method). Only the Super Admin can open it; the `print.custom` permission in `src/config/permissions.ts` controls who (give it to another role there, and remove it from `MANAGER_EXCLUDED` for managers).

### Choosing how a computer prints

Click the **printer icon** in the top bar (every role can) and pick, for that computer:

- **Thermal printer (direct)** (default): no driver, with a cut after the receipt and after the kitchen slip. If no printer is connected it falls back to the print dialog with a warning.
- **Print dialog (printer driver)**: for computers that print through an installed driver. No warnings, one cut per bill.

The choice is stored in that browser (not the database), so each computer keeps its own.

### Cashier setup (one time per computer)

1. Plug the printer in and switch it on.
2. Open the app in **Chrome or Edge** and click the **printer icon** in the top bar.
3. Choose the printer in the list and click Connect. The dot on the icon turns green.

That is all. Chrome remembers the printer, so it reconnects by itself every day. If the dot is grey, the printer is off or unplugged.

### Windows only: one-time technician step

Windows attaches its own USB printer driver, which stops Chrome from using the printer. Switch the printer to the generic WinUSB driver once:

1. Install [Zadig](https://zadig.akeo.ie/) and run it.
2. Options, then **List All Devices**. Pick **KPC307-UEWB** (USB ID `4B43 3830`).
3. Choose **WinUSB** as the driver and click **Replace Driver**.
4. Reopen Chrome and connect the printer as above.

After this, Windows' own "Printers & scanners" can no longer print to it; this app is its only way. Undo it by uninstalling the device in Device Manager and replugging. macOS, Linux and ChromeOS need no extra step.

### Troubleshooting

- _"The printer is in use by another program or driver"_: on Windows, do the WinUSB step. On macOS, remove any print queue for the printer in System Settings, Printers & Scanners.
- _No printer icon in the top bar_: the browser has no WebUSB (Safari, Firefox). Use Chrome or Edge.
- _Prints but does not cut, or cuts through the paper_: the cut command is in `src/lib/escpos.ts` (`cut()`).

### Print agent (optional, developer use)

`npm run print-agent` starts a small loopback-only server (`scripts/print-agent.mjs`) that writes the same bytes to the USB printer. Use `-- --list` to see the printer and `-- --test` to print a test slip. Environment: `PRINTER_USB` (hex `vendor:product`), `PRINT_AGENT_PORT` (default 9101), `PRINT_AGENT_ORIGINS` (allowed sites, default `http://localhost:3000,http://localhost:3001`). Needs `npm install` on that computer.

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
- **Staff** (super admin and manager): the people who work at the counter, with an optional title and a "can take payments" switch. They have no login. Turn someone off when they leave; someone who is on past bills can be turned off but not deleted, so those bills keep their name.
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

| Report                                 | What it shows                                                          |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Sales                                  | Bills, items, subtotal, discount, tax and total per day, week or month |
| By category / item / cashier / payment | Quantity, revenue and share for each, best first                       |
| Tax                                    | SGST and CGST collected per tax rate, reconciling to the bill totals   |
| Discounts                              | Every discounted bill with its cashier and percentage of subtotal      |
| Stock value                            | Tracked items valued at cost (a snapshot of today, so no date range)   |
| Stock movement                         | Received, sold, wasted and corrected quantities per item               |

The date range defaults to the last 30 days (Today, 7 days, 30 days or a custom range up to a year) and lives in the URL, so a view can be bookmarked. Figures count completed bills only; void, refunded and held bills are not sales. Tables stop at 500 rows and say so; narrow the range to see the rest. CSV files contain plain numbers and neutralise spreadsheet formulas. PDFs print amounts without a currency symbol (the built-in PDF fonts have no rupee glyph) and state the currency in the header. The two stock reports are hidden when Inventory is off.

## Accessibility

Targets WCAG 2.1 AA. Every page has one `h1`, a skip link and a `main` landmark; form fields have labels and inline error text; charts have a text summary and the same numbers in the table beside them; tables use real header cells; focus rings are visible; light and dark themes keep AA contrast (the accent colour setting checks this and picks readable text); motion respects `prefers-reduced-motion`; no page scrolls sideways at 390px. A scripted check of 17 pages for missing names, labels, duplicate ids and landmarks is clean.

## Architecture

The full picture (directory map, layering, auth, database, key flows, where to put new code) is in [ARCHITECTURE.md](ARCHITECTURE.md). Conventions are in [STYLE.md](STYLE.md). In short:

```
src/
  app/            (app) staff pages, (auth) login, (print) receipts, (customer)/c public menu, api/*
  components/     ui/ (shadcn), layout/ (shell), one folder per feature
  config.ts       App settings and default business settings
  config/         permissions.ts (the role matrix), navigation.ts, page-copy.ts, demo.ts
  db/             Drizzle client and one schema file per table
  lib/            api envelope + withAuth, money, dates, validation/, printing, helpers
  services/       All business logic and database access
  hooks/ types/   Shared hooks and types
drizzle/          Generated, ordered SQL migrations
scripts/          migrate.ts, seed.ts, print-agent.mjs
tests/            Vitest tests
docs/             Agent skills and design notes
```

**Rules the code follows**

- Business logic lives in `src/services`. Routes and components stay thin.
- Every API route is wrapped in `withAuth` and answers with `{ success: true, data, pagination? }` or `{ success: false, error }`.
- Input is validated with Zod on the client and the server.
- Money is `numeric` in Postgres and `Decimal` in code. Never floats. See `src/lib/money.ts` and the rules at the top of `src/services/calculations.ts`.
- The permission matrix lives in one file, `src/config/permissions.ts`. The proxy, API routes, server pages and the sidebar all read from it.

### Roles

| Capability                     | Super admin | Manager | Cashier  |  Counter   |
| ------------------------------ | :---------: | :-----: | :------: | :--------: |
| Dashboard                      |     yes     |   yes   |   yes    |     no     |
| New Bill                       |     yes     |   yes   |   yes    |    yes     |
| Customers                      |   manage    | manage  | look up  | no (menus) |
| Bill History                   |  all bills  |   all   | own only |  own only  |
| Menu                           |   manage    | manage  |   read   | no (menus) |
| Categories, Inventory, Reports |     yes     |   yes   |    no    |     no     |
| Void / refund bills            |     yes     |   yes   |    no    |     no     |
| Audit log                      |     yes     |   yes   |    no    |     no     |
| Staff list                     |     yes     |   yes   |    no    |     no     |
| Users & roles, Settings        |     yes     |   no    |    no    |     no     |
| Custom Print (thermal)         |     yes     |   no    |    no    |     no     |

**Counter** is one shared login for a till that several people use. It signs in once, sees only New Bill and Bill History in the menus (it still reads the menu and customers behind the scenes, because the billing screen needs them), and lands on the billing screen. Each bill must name its cashier, picked from the **Staff** list; see [Shared till](#shared-till).

Access is enforced in three places. The proxy (`src/proxy.ts`) does a coarse check from the session token. Server pages and `withAuth` re-read the user from the database on every request, so a revoked role or deleted account takes effect immediately. The sidebar hides what a role cannot open. Newly granted access reaches the proxy after the user signs in again.

### Shared till

For a till that several people share, create one user with the **Counter** role and add each person under **Admin → Staff**. Signed in as Counter, the billing screen shows a **Cashier** choice above the payment, and **Save & print** stays off until one is picked. The choice is cleared after every bill, so each bill names its own cashier.

- The bill keeps two things apart: the account that saved it (the Counter login, which decides who may see it) and the cashier (the staff member picked, with their name saved on the bill so a later rename never changes an old receipt).
- Receipts, Bill History (filter by cashier) and the By cashier and Discounts reports use the cashier when there is one, and the account otherwise. Each bill falls in exactly one group, so the per-cashier totals always add up to the overall total.
- Bills made before this was set up have no cashier and keep showing the account that saved them. Nothing is rewritten.
- Held bills belong to the account that created them, so finish or discard held bills before switching a till to the Counter login.
- Anyone can pick any cashier; there is no PIN.

### Database

Tables use the `app_` prefix: `users`, `categories`, `menu_items`, `customers`, `bills`, `bill_items`, `bill_kots` (kitchen orders sent per bill), `payments`, `staff_members` (the people picked as cashier on a shared till), `stock_movements`, `suppliers`, `purchases`, `purchase_items`, `audit_logs`, `settings`. Ids are `bigint identity` (users use `uuid`) and timestamps are `timestamptz`. Bill lines store a snapshot of name, price and tax, so menu edits never change old bills.

## Features

| Area                                                                                                                             | Milestone |
| -------------------------------------------------------------------------------------------------------------------------------- | :-------: |
| Auth (password + optional SSO), roles, sidebar shell, theme, command palette                                                     | 1 (done)  |
| Categories (drag to reorder, block-delete) and Menu CRUD: table/grid, filters, bulk actions, photos, variants, CSV import/export | 2 (done)  |
| POS billing, bill saving, thermal receipts, PDF, WhatsApp/email sharing                                                          | 3 (done)  |
| Bill History: filters, sort, CSV/XLSX export, reprint, void and refund with restock                                              | 4 (done)  |
| Dashboard: KPIs with trends, revenue, hourly, category and payment charts, top items, low stock                                  | 5 (done)  |
| Customers, Users & Roles, Audit log, Settings, Profile                                                                           | 6 (done)  |
| Inventory: stock, movements, alerts, suppliers                                                                                   | 7 (done)  |
| Reports, accessibility pass, docs                                                                                                | 8 (done)  |

## Roadmap

All eight milestones are built. Not done: recipe and ingredient tracking (an optional stretch goal), and tax-inclusive pricing (prices are tax-exclusive by design). See [Deploying to Vercel](#deploying-to-vercel).
