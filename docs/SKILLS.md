# Agent skills for this project

Skills are installable instruction packs for code agents. This app was built with the ones below. **Before starting any implementation, check which are installed and install the missing ones.** Do this once per machine; it is not part of the app's own setup.

## 1. Check what is installed

```bash
npx skills list -g 2>/dev/null || ls ~/.agents/skills ~/.claude/skills 2>/dev/null
```

Compare against the tables below. Skills install to `~/.agents/skills` (shared) and appear in `~/.claude/skills`; restart the agent session after installing so they are picked up.

## 2. Install the missing ones

Required (they match the stack, so install all of them):

| Skill                     | Install                                                                     | Why it is needed here                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `neon`                    | `npx skills add neondatabase/agent-skills@neon -g -y`                       | Neon project, branches, CLI (`neon.ts`, `.neon`) and the branch-first workflow           |
| `neon-postgres`           | `npx skills add neondatabase/agent-skills@neon-postgres -g -y`              | Database work: schema, SQL, Drizzle on Neon                                              |
| `neon-object-storage`     | `npx skills add neondatabase/agent-skills@neon-object-storage -g -y`        | Menu photos live in Neon Object Storage (`src/lib/object-storage.ts`, `neon.ts` buckets) |
| `postgres-best-practices` | `npx skills add neondatabase/postgres-skills@postgres-best-practices -g -y` | Query, index and schema review                                                           |
| `ask-sonner`              | `npx skills add emilkowalski/skills@ask-sonner -g -y`                       | All toasts use `sonner`                                                                  |
| `interface-design`        | `npx skills add dammyjay93/interface-design@interface-design -g -y`         | POS, dashboard and admin screens                                                         |
| `web-design-guidelines`   | `npx skills add vercel-labs/agent-skills@web-design-guidelines -g -y`       | Accessibility and UX audit used for the milestone 8 pass                                 |
| `emil-design-eng`         | `npx skills add emilkowalski/skills@emil-design-eng -g -y`                  | UI polish and component detail                                                           |
| `mobile-native`           | `npx skills add emilkowalski/skills@mobile-native -g -y`                    | The POS runs on phones and tablets                                                       |

Optional (install when the task calls for it):

| Skill                                                             | Install                                                                          | Use it for                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `design-taste-frontend`                                           | `npx skills add Leonxlnx/taste-skill -g -y`                                      | The public customer menu only (not the POS or dashboards)       |
| `animate`, `animation-performance`, `review-animations`           | `npx skills add emilkowalski/skills@animate -g -y` (same pattern for the others) | Adding or reviewing motion                                      |
| `break-ui`                                                        | `npx skills add emilkowalski/skills@break-ui -g -y`                              | Stress-testing screens with long names, empty and huge data     |
| `neon-auth`, `neon-functions`, `neon-ai-gateway`, `neon-realtime` | `npx skills add neondatabase/agent-skills@<name> -g -y`                          | Only if you move off Auth.js, add functions, AI or live queries |
| `find-skills`                                                     | `npx skills add vercel-labs/skills@find-skills -g -y`                            | Discovering further skills                                      |

Also useful, from Claude Code plugins: `playwright` (drive the running app in a browser to check a change in light and dark themes and at phone width) and `frontend-design`. Plugins are enabled with `/plugin`.

If a command above fails because the source moved, run `npx skills find <name>` and install the match from the same owner. Don't skip a required skill silently; tell the user which one could not be installed.

## 3. How agents should use them

- Database or schema change: `neon-postgres` (and `postgres-best-practices` for review), then follow the schema workflow in [ARCHITECTURE.md](../ARCHITECTURE.md#database).
- Photos or file uploads: `neon-object-storage`.
- New or changed UI: `interface-design` while building, `web-design-guidelines` to review, `mobile-native` for phone behaviour, `ask-sonner` for toasts. Rules still come from [STYLE.md](../STYLE.md).
- When a skill's advice conflicts with this repo's docs, the repo docs win.

## Provenance

This list comes from the stack in `package.json` / `components.json` / `neon.ts` and the skills installed on the maintainer's machine (`~/.agents/.skill-lock.json`), not from a build log. Add a row here when you start relying on a new skill.
