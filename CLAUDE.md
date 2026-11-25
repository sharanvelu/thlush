# Thlush

@AGENTS.md

## Before you start

1. Check the skills listed in `docs/SKILLS.md` and install any required ones that are missing, **before** implementing anything. Tell the user if one cannot be installed.
2. Use `ARCHITECTURE.md` (where things go) and `STYLE.md` (conventions) instead of exploring the repo or choosing your own patterns.
3. Run `npm run check` before finishing; it is what CI runs.

# Project rules

## Customer pages: light and dark theme support
- Every customer-facing page and component (everything under `src/app/(customer)` and `src/components/customer`) must work in **both** the light and the dark theme. Check both before calling the work done.
- Style with the theme tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, ...). Never hard-code colours (hex, `white`, `black`, palette classes like `zinc-900`) unless there is a `dark:` counterpart.
- The customer site defaults to **system** (follows the visitor's device). Visitors choose Light, Dark or System with the toggle in the customer layout (`CustomerThemeToggle`), and the choice is saved in local storage under `customer-theme`. Don't change that default or key without asking. The settings live in `src/lib/customer-theme.ts`.
- A new customer page gets the toggle and theming from `src/app/(customer)/c/layout.tsx`, so put it under that layout. Don't add a second theme provider.
