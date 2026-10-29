# Thlush design system

## Direction
A billing counter: thermal receipt paper, ink, turmeric. Warm neutrals only (one hue family), a single turmeric accent used for action and identity, never decoration. Calm, dense enough for a cashier at rush hour, quiet enough to read at a glance.

**Signature:** the receipt. The billing cart renders as thermal paper (`.receipt`, perforated bottom edge, dashed rules, mono numerals, large total). Echoed in the dashboard revenue card, bill-history expanded rows and the login motif.

## Depth
Hairline rings + whisper shadows (single strategy). `.card` = `box-shadow: var(--ring)`. Popovers/modals use `--ring-pop`. Dark mode drops depth shadows and relies on the ring. No `border-2`, no gradients, no `dark:` classes: everything binds to tokens that flip with `data-theme`.
Sidebar shares the canvas colour; separated by a 1px line only. Inputs are inset (`--sunken`) and lift to `--surface` on focus.

## Tokens (src/app/globals.css)
- Surfaces: `canvas` (page) · `surface` (cards) · `sunken` (inputs, hover) · `raised` (popovers, modals, receipt)
- Text (4 levels): `ink` · `ink-2` · `ink-3` · `ink-4`
- Lines: `line` (default) · `line-strong` (emphasis/hover)
- Accent: `accent`, `accent-hover`, `accent-ink`, `accent-soft` (turmeric #e8650a light / #ff8a2b dark)
- Semantic (+ `-soft` fills): `good` cardamom, `bad` chilli, `warn` ochre, `info` steel blue
- Theme: system by default, manual toggle sets `html[data-theme]`, persisted in `localStorage thlush:theme`; inline head script prevents flash.

## Type
Geist Sans + Geist Mono. Base 14px/1.5. Hierarchy comes from weight + colour more than size.
Scale: caption 11 · small 12 · body 13/14 · title 15 · heading 20 · page title 26 (tracking -0.02em) · hero number 56 (tracking -0.04em).
`.num` (mono, tabular-nums) for every price, quantity, id and total. `.eyebrow` = 11px/500 uppercase tracked, ink-3.

## Spacing & shape
4px base. Card padding 20 (`.card-pad`), table cells 12/16, sidebar item 36px high.
Radius scale: 7-8 controls · 10 large buttons · 14 cards · 16 modals · full for badges/avatars.
Sidebar 248px (68px collapsed). Content max-width 1240px.

## Components (class-based, globals.css)
- Button `.btn` 34px h, 13px/500, 8px radius; variants `-primary -secondary -ghost -danger`; sizes `-sm` 28px, `-lg` 42px; `-icon` square. `:active` scale .97.
- Field `.field` 36px, inset; `.field-label` 12px/500 ink-2. Inputs live in `components/Inputs/*` (Input, Number, Select, TextArea) and keep their old props.
- Badge `.badge` 20px pill; `-good -bad -warn -info -accent`, `-dot`.
- Table `.tbl` 11px uppercase headers, hairline rows, hover = sunken.
- Also: `.card-head`, `.card-title`, `.skeleton`, `.empty`, `.receipt`, `.rule-dash`, `.rise`, `.pop`.
- Shell: `AppShell` (collapsible sidebar, mobile drawer, theme toggle, profile/sign-out), `PageHeader`, `Icon` (inline SVG set, no icon dependency), `ConfirmModal`.
- Add/edit forms (`MenuAdd`, `CategoryAdd`, user form) are right-side slide-over sheets with sticky footer, Esc to close.

## Motion
Only transform/opacity, <300ms, ease-out `cubic-bezier(0.23,1,0.32,1)`. Popovers scale from 0.96 at trigger origin. `prefers-reduced-motion` disables entrances.

## Rules for new UI
Use tokens and component classes, never raw hex/gray-*. Numbers in `.num`. One focal element per screen. Every list needs loading (skeleton), empty and error states. Prefer whitespace and tonal shift over extra borders.
