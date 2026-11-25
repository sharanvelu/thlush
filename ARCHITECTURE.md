# Architecture

How Thlush is put together. Read this before changing code; it should save you from exploring the repo. For setup, env vars and feature walk-throughs see [README.md](README.md); for UI rules see [STYLE.md](STYLE.md); for the agent checklist see [AGENTS.md](AGENTS.md).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript (strict, `noUncheckedIndexedAccess`). **Not the Next.js in your training data**: read `node_modules/next/dist/docs/` first. `middleware` is now `src/proxy.ts`. |
| Styling / UI | Tailwind CSS v4 (tokens in `src/app/globals.css`), shadcn/ui (`radix-nova` style, config in `components.json`), lucide icons, `sonner` toasts, `next-themes` |
| Data | Neon Postgres via `@neondatabase/serverless` (WebSocket pool, so interactive transactions work), Drizzle ORM, migrations in `drizzle/` |
| Auth | Auth.js v5 (`next-auth` beta): email + password, optional OIDC SSO. Session is a signed JWT cookie |
| Validation | Zod 4, schemas in `src/lib/validation/` shared by client forms (react-hook-form) and API routes |
| Money | `decimal.js` through `src/lib/money.ts` |
| Files | Neon Object Storage (S3 API, `src/lib/object-storage.ts`) for menu photos; falls back to the database when the `AWS_*` vars are unset |
| Output | PDFs with `pdfkit`, XLSX with `exceljs`, thermal printing as raw ESC/POS bytes, QR codes with `qrcode` |
| Tests | Vitest (`tests/**/*.test.ts`), node environment, no database or network |
| Hosting | Vercel (`vercel.json`, region `sin1`) + Neon |

## Two sites, one app

One Next.js project serves two audiences, chosen by hostname in `src/proxy.ts` (logic in `src/lib/host-routing.ts`):

- **Staff POS** (`APP_DOMAIN_POS`): everything under `src/app/(app)`, `(auth)`, `(print)` and `api/`.
- **Customer site** (`APP_DOMAIN_CUSTOMER`): public menu under `src/app/(customer)/c`. The proxy rewrites the customer domain onto `/c/...`, and sets the `x-thlush-site` header so the root layout picks the customer theme default.
- With both domain vars empty (local, previews) everything is reachable and the customer pages live at `/c`. Once either is set, any unknown host gets an empty 404.

Customer pages have their own theme rules (light/dark/system, key `customer-theme`); see [STYLE.md](STYLE.md#customer-site).

## Directory map

```
src/
  proxy.ts            Host routing, sign-in redirect, coarse role check (runs on every request)
  auth.ts, auth.config.ts   Auth.js setup (config is edge-safe, auth.ts adds DB and password logic)
  env.ts              Zod-validated env vars. config.ts: static app config + default runtime settings
  app/
    (app)/            Staff pages: billing, bills, menu, categories, customers, inventory, reports,
                      admin/{users,settings,audit-log}, feedback, profile, thermal-print/custom, forbidden
    (auth)/login      Sign-in page
    (print)/receipt/[id]   Printable receipt page
    (customer)/c      Public customer menu (own layout + theme toggle)
    api/              REST route handlers (one folder per resource, see below)
    actions/auth.ts   Server actions (sign in/out only; everything else is an API route)
  components/
    ui/               shadcn primitives. Add with `npx shadcn add <name>`; avoid hand-editing
    layout/           App shell, sidebar, top bar, command palette, page header, empty state
    pos/ bills/ menu/ categories/ customers/ inventory/ dashboard/ reports/ settings/ admin/
    receipt/ thermal-print/ customer/ theme/ auth/ profile/ common/   Feature components
  services/           All business logic and database access (see "Layering")
  lib/                Pure helpers: api, money, dates, format, csv, escpos*, printing, validation/*
  db/                 index.ts (client), prefix.ts, schema/*.ts (one file per table)
  config/             permissions.ts, navigation.ts, page-copy.ts, demo.ts, category-icons.ts
  hooks/ types/       Shared hooks and types (api envelope, session user, settings, bill)
tests/                Vitest unit tests, flat, named after the module
scripts/              migrate.ts, seed.ts, print-agent.mjs
drizzle/              Generated SQL migrations + meta (commit them)
docs/                 Design notes for things not built yet
```

## Layering

```
page.tsx (server)  ─┐
route.ts (API)     ─┼─> services/*  ─> db (Drizzle)
server actions     ─┘        │
                             └─> lib/* (pure), lib/validation/* (Zod)
client components ──fetch──> route.ts   (via lib/api-client.ts)
```

- **Services own the logic.** Files are `PascalCaseService.ts` (e.g. `CategoryService`, `BillingService`) exporting plain functions, imported as `import * as CategoryService from "@/services/CategoryService"`. Pure planning/maths live in lower-case files (`bill-plan.ts`, `calculations.ts`, `kot-plan.ts`, `packaging.ts`) so they can be unit tested without a database.
- **Route handlers stay thin**: wrap in `withAuth`, parse with `parseBody`/`parseQuery`, call a service, return `ok()` / `paginated()`.
- **Server pages** call `requireAccess(permission)` and render `<Forbidden />` when not allowed, then call services directly (no HTTP hop).
- **Client components** talk to the API with `api.get/post/...` from `src/lib/api-client.ts` and throw `ApiClientError`.
- Services accept an optional `executor` (`db` or a transaction, type `DbExecutor`) when they must join a caller's transaction.
- Every state change writes an audit entry via `AuditService`: `record` (propagates errors, use inside a transaction) or `log` (swallows errors, for sign-ins and the like). `AuditLogService` is the read side for the Audit log page.

### API conventions

- Envelope: `{ success: true, data, pagination? }` or `{ success: false, error, fieldErrors? }` (types in `src/types/api.ts`).
- Errors: throw `HttpError.badRequest/unauthorized/forbidden/notFound/conflict`. `ZodError` becomes 422 with `fieldErrors`. Anything else is a logged 500.
- Every route uses `withAuth(handler, { permission | anyOf })`, except the public ones (`/api/auth`, `/api/health`, `/brand-icon`) and the customer-site routes (`/api/c/...`, reached through the host rewrite and only exposing what the public menu shows).
- Lists are server-paged: `paginationQuerySchema`, default 20, max 100.
- Ids in routes go through `parseId`; a bad id is a 404.

## Auth and permissions

- Roles: `super_admin`, `manager`, `billing` (shown as **Cashier**). SSO users start as `billing`.
- `src/config/permissions.ts` is the **only** place defining who can do what: `ROLE_PERMISSIONS` (role to permission set) and `ROUTE_PERMISSIONS` (URL prefix to permission). Keep it free of server-only imports.
- Enforced in three layers: proxy (coarse, from the token, so role changes apply after next sign-in), `withAuth` / `requireAccess` (re-read the user from the DB every request, so revocation is immediate), and the sidebar (`config/navigation.ts`) hiding what a role cannot open.
- Cashiers only ever see their own bills, enforced in the service, not just the UI.

## Database

- All tables are created through `table()` in `src/db/schema/_shared.ts`, which applies the `DB_TABLE_PREFIX` (default `app_`). Enums and indexes use `prefixed()` / `ix()` too. Never hard-code a table name in SQL.
- Tables: `users` (uuid id), `categories`, `menu_items`, `customers`, `bills`, `bill_items`, `bill_kots`, `bill_feedback`, `bill_feedback_items`, `payments`, `stock_movements`, `suppliers`, `purchases`, `purchase_items`, `audit_logs`, `settings`. Other ids are `bigint identity` (`bigId()`), timestamps are `timestamptz`.
- Runtime settings are key/value rows in `settings`, merged over `defaultSettings` in `src/config.ts` (`SettingsService.getSettings`). Add a new setting by extending `AppSettings` (`src/types/settings.ts`), `defaultSettings` and the Zod schema in `src/lib/validation/settings.ts`.
- **Schema change workflow**: edit `src/db/schema/*`, run `npm run db:generate`, commit the new `drizzle/*.sql` and meta. CI fails on drift. Migrations are applied by hand with `npm run db:migrate`, never by the build.
- Bill lines snapshot name, price and tax, so menu edits never alter history. Soft-deleted ("archived") menu items stay referenced.

### Money and rounding

Amounts are `numeric` (strings from Drizzle). Use `D`/`toDecimal`/`round2` from `src/lib/money.ts` for all arithmetic, never JS numbers. Tax is tax-exclusive, rounded half-up to 2 dp per component (SGST, CGST) per line; totals are sums of rounded lines. Format for display with `formatMoney`.

### Dates

Business-day logic uses the configured business timezone (`src/lib/dates.ts`, `formatDate*` in `src/lib/format.ts`). Do not use `new Date().toLocaleDateString()` for anything shown on a bill or report.

## Key flows

- **Saving a bill** (`BillingService`, `bill-plan.ts`): the browser sends ids, quantities, discounts and payments; the server prices everything from the catalog. One transaction writes customer, bill, lines, payments, stock movements and the audit entry. Bill numbers `{prefix}{YYYYMMDD}-{seq}` are taken under a per-day lock. Each save carries a `clientRef`, so a retry returns the same bill. Held bills carry a temporary number.
- **Customer feedback** (`FeedbackService`, `lib/feedback.ts`, tables `bill_feedback` and `bill_feedback_items`): `POST /api/bills/[id]/feedback-link` (permission `bills.create`) creates or replaces the bill's single form row with a new 256-bit secret (only its SHA-256 is stored) and a 24-hour `expires_at`, and returns the URL; the billing success dialog draws it as a QR with the `qrcode` package. The customer opens `(customer)/c/feedback/[token]` and posts to `/api/c/feedback/[token]` (public, the secret is the credential). Submission is guarded by `WHERE submitted_at IS NULL AND expires_at > now()`, so a form is answered once. `bills.status` must be `completed`. Contact fields are asked only when the bill's customer lacks a name or phone. Staff read it on `/feedback` (permission `feedback.view`, super admin and manager) and in the `feedback` report. The feature is `features.feedback` in settings.
- **KOT / running orders** (`kot-plan.ts`, `bill_kots`): "Send to kitchen" saves a held bill and prints only items not yet sent.
- **Void / refund** (`BillHistoryService`): needs a reason, restocks exactly what the sale deducted (read from `stock_movements`), only once per bill.
- **POS catalog cache** (`lib/catalog-cache.ts`): the billing screen's catalog is cached with tag `pos-catalog`. Anything that changes menu items, categories or prices must call `invalidatePosCatalog()`.
- **Printing** (`lib/escpos*.ts`, `print.ts`, `webusb-printer.ts`): the server builds ESC/POS bytes (`/api/bills/[id]/escpos`); the browser sends them via WebUSB, the optional local print agent, or the print dialog. The per-computer choice is stored in localStorage.
- **Exports**: CSV/XLSX (`BillExport`, `lib/csv.ts`) and PDF (`ReceiptPdf`, `ReportPdf`). Exports cap at 10,000 rows.
- **Photos**: uploaded through `/api/menu/[id]/image`, stored in Neon Object Storage, served publicly for the customer menu via `/api/c/menu/[id]/image`.
- **SSO logout**: three modes chosen in Settings, logic in `lib/oidc-logout.ts` and `lib/background-logout.ts`.

## Testing

`npm test` runs Vitest. Tests cover pure logic (calculations, bill and KOT planning, escpos, csv, validation, host routing, settings, reports, dashboards). There are no component or database tests, so keep new logic in pure functions where you can and test it in `tests/<module>.test.ts`. `npm run check` = lint + typecheck + tests, and is what CI runs before a build.

## Where to put new things

| You are adding | Put it in |
| --- | --- |
| A page | `src/app/(app)/<area>/page.tsx` (server), with `export const metadata`, `requireAccess`, and a client `*-view.tsx` in `src/components/<area>/` |
| A sidebar entry | `src/config/navigation.ts` (each item still needs a `milestone` number; nothing reads it any more, so use the highest existing one) plus a route permission in `src/config/permissions.ts` |
| An API endpoint | `src/app/api/<resource>/route.ts` using `withAuth` |
| Business logic | `src/services/<Name>Service.ts` (pure parts in a lower-case sibling, tested) |
| A form schema | `src/lib/validation/<area>.ts`, shared by form and route |
| A table or column | `src/db/schema/<table>.ts`, export from `schema/index.ts`, then `npm run db:generate` |
| A permission | `PERMISSIONS` and `ROLE_PERMISSIONS` in `src/config/permissions.ts`, and update the role table in README |
| A setting | See "Database" above |
| A customer page | Under `src/app/(customer)/c/`, so it inherits the theme toggle |
| A shadcn component | `npx shadcn add <name>` (writes to `src/components/ui`) |
