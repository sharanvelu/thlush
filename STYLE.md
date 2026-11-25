# Style guide

Conventions for code and UI. Follow what is here instead of inventing a new pattern; when a rule is missing, copy the nearest existing file. Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md).

## Code

- **TypeScript strict.** No `any` (ESLint errors on it). Unused names must start with `_`. Remember `noUncheckedIndexedAccess`: indexed reads can be `undefined`.
- **Imports** use the `@/` alias for everything under `src/`. Services are imported as namespaces: `import * as BillingService from "@/services/BillingService"`.
- **Files**: components and hooks are `kebab-case.tsx` (`customer-picker.tsx`, `use-mobile.ts`); services are `PascalCaseService.ts`; pure service helpers and `lib/` files are `kebab-case.ts`; tests are `tests/<module>.test.ts`.
- **Server vs client**: components are server components by default. Add `"use client"` only to the interactive leaf (usually the `*-view.tsx`). Never import `@/db` or services into a client component.
- **Comments** explain *why*, in plain sentences, and doc comments sit on exported functions and non-obvious rules. Don't narrate what the code does.
- **Validation** is Zod, defined once in `src/lib/validation/` and reused by the form (react-hook-form + `@hookform/resolvers`) and the route.
- **Errors**: throw `HttpError.*` in services; show `errorMessage(error)` in a `toast.error` on the client. Messages are for the cashier: short, plain, no jargon or stack traces.
- **Money** only through `src/lib/money.ts` (`Decimal`). Never `+`, `*` or `toFixed` on amounts.
- **Database names** only through `table()`, `prefixed()` and `ix()`.
- **No new dependency** without a reason. Check `package.json` and `src/lib` first; there is already a helper for dates, CSV, formatting, debouncing and mobile detection.
- **Formatting**: 2 spaces, double quotes, semicolons, trailing commas, lines up to about 120 characters. Match the surrounding file; `npm run lint` is the arbiter.

## Commits and pull requests

- Conventional Commits for **both** commit messages and PR titles: `feat: ...`, `fix(scope): ...`. Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore. CI rejects other titles.
- One concern per PR. Run `npm run check` (and `npm run build` for UI or routing changes) before pushing.
- If you changed `src/db/schema`, commit the generated `drizzle/` files. If you added an env var, update `.env.example`, `src/env.ts` and the README table.
- Update the docs your change touches (README feature text, ARCHITECTURE tables, permission table).

## UI

The staff app is a POS used on tablets and phones at a busy counter, often with one hand. Optimise for speed, legibility and forgiving taps.

### Theme and colour

- Use theme tokens only: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`, `text-destructive`, `text-success`, `text-warning`. Tokens are defined for light (`:root`) and dark (`.dark`) in `src/app/globals.css`, in OKLCH.
- Never hard-code hex, `white`, `black` or palette classes (`zinc-900`, `orange-600`) unless a `dark:` counterpart sits beside it. `GLASS_MENU` (`components/layout/glass.ts`) is the existing example of a deliberate pair.
- `--primary` is the single brand accent (warm orange) and can be overridden at runtime from Settings. Don't introduce a second accent. Charts use `--chart-1..5`.
- Check **both** themes before calling UI work done. Contrast must stay at WCAG AA (4.5:1 for text).

### Components and layout

- Build with the shadcn primitives in `src/components/ui` and `lucide-react` icons. Need something new? `npx shadcn add <name>`.
- Page shell: `PageHeader` (title, description, actions) then content. Empty lists use `EmptyState`; loading uses the skeletons in `page-skeleton.tsx`; no-permission uses `Forbidden`.
- Radius, shadows and spacing come from the tokens (`rounded-lg`, `shadow-card`). Don't invent new radii or shadow values.
- Feedback: `toast.success` / `toast.error` from `sonner` for outcomes, `AlertDialog` for destructive confirmations (void, delete), inline `fieldErrors` under inputs for validation.
- Copy is sentence case, plain English, addressed to the user ("Deleted Asha. Their 3 bills stay in history."). Page titles and descriptions live in `src/config/page-copy.ts` and `src/config/navigation.ts`.

### Responsive and touch

- Mobile first. The billing screen is a two-pane layout on wide screens and a bottom bar plus sheet on phones. Test at roughly 375, 768 and 1280 px widths.
- Tap targets at least 40 px high in the POS; inputs at least 16 px font so iOS doesn't zoom.
- Keyboard shortcuts on the billing screen are documented in the README; don't reuse a bound key.

### Accessibility

- Every control has an accessible name (icon-only buttons need `aria-label`), focus rings stay visible, dialogs trap focus (use the shadcn ones), colour is never the only signal (pair status colours with text or icon).
- Respect `prefers-reduced-motion`. Keep motion short and purposeful; the POS shouldn't make anyone wait for an animation.

### Customer site

Everything under `src/app/(customer)` and `src/components/customer` must work in **light and dark**:

- Defaults to **system**; the visitor picks Light, Dark or System with `CustomerThemeToggle`, saved in localStorage under `customer-theme`. Settings are in `src/lib/customer-theme.ts`. Don't change the default or the key without asking.
- The staff app stores its own theme under `theme`; the two must never share a key.
- New customer pages go under `src/app/(customer)/c/` so they get the layout and toggle. Don't add a second theme provider.
- Use `text-brand` for the accent used as text (it lifts lightness in dark mode); use `bg-primary` for fills.

### Marketing-style pages

The skill `design-taste-frontend` is for public landing pages, not for the POS or dashboards. Use it for the customer site only, and still follow the token rules above.
