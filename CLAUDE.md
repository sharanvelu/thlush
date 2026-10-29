# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thlush is a food ordering/billing system built with Next.js 16, React 19, TypeScript, NeonDB (PostgreSQL), and Tailwind CSS v4. It handles menu management, category organization, and billing with tax calculations (SGST/CGST).

## Commands

```bash
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

No test framework is currently configured.

## Architecture

**Routing**: Next.js App Router (`src/app/`). Main pages: `/billing`, `/menu`, `/categories`. API routes under `src/app/api/` with dynamic segments for CRUD (`/api/menu/[id]`, `/api/categories/[id]`).

**Services layer** (`src/services/`): Business logic lives here, not in API routes or components.
- `MenuService.ts` / `CategoryService.ts` / `BillingService.ts` / `CustomerService.ts` / `UserService.ts` — CRUD operations via NeonDB
- `NeonService.ts` — Neon serverless client factory
- `AuthService.ts` — Server-side auth helper wrapping Auth.js
- `DatabaseService.ts` — Table name configuration

**Components** (`src/components/`): Mix of server and client components (`'use client'` directive). Form inputs are modular under `components/Inputs/`. Status tags under `components/Tags/`.

**Types** (`src/types/`): Shared TypeScript types. API responses use `SuccessResponse<T>`, `ErrorResponse`, `PaginatedResponse<T>` from `global.ts`.

**Config** (`src/config.ts`): App-level settings including `ignore_tax` flag that controls SGST/CGST calculation.

**Helpers** (`src/helpers.ts`): Tax calculation utilities (`calculateTotalTaxValue`, `calculateTotalTaxPriceValue`, `calculateTotalValue`, `formatValue`).

## Database

NeonDB (PostgreSQL) with tables: `thlush_menu_items`, `thlush_categories`, `thlush_bills`, `thlush_bill_items`, `thlush_customers`, `thlush_users`. Auth uses Auth.js (NextAuth v5) with credentials + Authentik OIDC.

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=<neondb-connection-string>
NEXT_PUBLIC_APP_ENV=local|production
AUTH_SECRET=<auth-secret>
AUTHENTIK_ISSUER=<authentik-issuer-url>
AUTHENTIK_CLIENT_ID=<authentik-client-id>
AUTHENTIK_CLIENT_SECRET=<authentik-client-secret>
```

## Key Patterns

- Path alias: `@/*` maps to `./src/*`
- API routes perform auth checks via `AuthService.getAuthUser()` or `AuthService.checkAuth()`
- Client pages fetch data through API routes using `fetch()` with Next.js cache options
- State management is local React hooks only (no Redux/Zustand)
- Styling uses Tailwind utility classes with CSS variable theming and dark mode support
- NeonDB returns PostgreSQL numeric types as strings — parse with `parseFloat()` in service layer
