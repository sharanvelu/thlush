# GitHub security settings

The workflows in `.github/workflows/` only protect the repo if GitHub is told to **require** them. This page lists the repository settings and the branch ruleset to apply. They live in GitHub, not in the code, so nobody can see from the repo whether they are on: tick each box once and re-check after a repo transfer or rename. (Settings below were not applied by the PR that added this page.)

## 1. Ruleset for `main`

**Settings > Rules > Rulesets > New branch ruleset**, name `main`, enforcement **Active**, target branches: the default branch (`main`). Add `thlush-v2` as a second target while it is a long-lived integration branch; delete the branch and the target once it stops being one.

| Rule                                                | Setting                                                               | Why                                                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Restrict deletions                                  | on                                                                    | `main` can't be deleted.                                                                                                               |
| Block force pushes                                  | on                                                                    | History can't be rewritten.                                                                                                            |
| Require linear history                              | on                                                                    | Matches squash-merge, so every commit on `main` is one reviewed PR with a Conventional Commit title.                                   |
| Require a pull request before merging               | on                                                                    | No direct pushes to `main`.                                                                                                            |
| Required approvals                                  | `0` while you are the only maintainer; `1` once there is a second one | GitHub does not let you approve your own PR, and Dependabot's auto-merge needs a merge with no approval. Raise it when you add people. |
| Dismiss stale approvals on new commits              | on                                                                    | A later push can't ride on an old approval.                                                                                            |
| Require review from code owners                     | on once there is a second maintainer                                  | `.github/CODEOWNERS` already names the owner.                                                                                          |
| Require approval of the most recent push            | on once there is a second maintainer                                  | Stops the last pusher approving their own change.                                                                                      |
| Require conversation resolution                     | on                                                                    | Review comments can't be ignored.                                                                                                      |
| Allowed merge methods                               | **Squash** only                                                       | The PR title becomes the commit message, which `PR Title Lint` has checked.                                                            |
| Require status checks to pass                       | on, with **Require branches to be up to date**                        | See the list below.                                                                                                                    |
| Require signed commits                              | optional, on if you sign commits                                      | Signed history; skip if you don't, because squash-merges made on GitHub are signed by GitHub anyway.                                   |
| Block creations, updates and deletions of `v*` tags | optional                                                              | Only if you start tagging releases.                                                                                                    |

**Bypass list:** leave empty. If you must keep an emergency path, add only yourself (the repository admin role) with **Allow for pull requests only**, never "Always".

### Required status checks

Add exactly these names (the `name:` of each job). Search for them in the picker after each has run once on a PR, because GitHub only lists checks it has already seen:

- `PR Title Lint`
- `Code Style Gate`
- `Static Analysis Gate`
- `Tests Gate`
- `Build Check Gate`
- `Dependency Review`

Require only the `... Gate` jobs, never the jobs behind them: those are path-filtered and can be skipped, and a skipped required check blocks the PR forever. Set the source of each check to **GitHub Actions**, so another app can't report a fake success. The old `Lint, types, tests, build` and `PR title (Conventional Commits)` checks no longer exist; remove them from any existing branch protection rule or the PRs will wait on checks that never run.

If you prefer the old "branch protection rules" screen to rulesets, the same options exist there. Use one or the other, not both.

### Optional: apply it from the command line

Review before running. This creates the ruleset for `main` with the solo-maintainer defaults above:

```bash
gh api -X POST repos/<owner>/<repo>/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "PR Title Lint" },
          { "context": "Code Style Gate" },
          { "context": "Static Analysis Gate" },
          { "context": "Tests Gate" },
          { "context": "Build Check Gate" },
          { "context": "Dependency Review" } ] } }
  ],
  "bypass_actors": []
}
JSON
```

## 2. Repository settings

**General**

- Pull Requests: allow **squash merging** only; set the default commit message to **Pull request title**; turn off merge commits and rebase merging.
- Turn on **Allow auto-merge** (Dependabot auto-merge needs it) and **Automatically delete head branches**.
- Turn off wikis and projects if unused, to shrink the surface.

**Actions > General**

- Actions permissions: **Allow owner, and select non-owner actions**, with GitHub-created actions allowed and these patterns added: `dorny/paths-filter@*`, `amannn/action-semantic-pull-request@*`, `raven-actions/actionlint@*`, `zizmorcore/zizmor-action@*`, `dependabot/fetch-metadata@*`. Turn on **Require actions to be pinned to a full-length commit SHA**.
- Workflow permissions: **Read repository contents and packages permissions** (read-only default token). Leave **Allow GitHub Actions to create and approve pull requests** off. Every workflow here also declares `permissions: {}` at the top and grants per job.
- Fork pull request workflows: **Require approval for all outside collaborators**. This repo has no secrets in PR checks, but approval keeps strangers from spending your minutes.

**Advanced Security** (some of these need GitHub Advanced Security if the repo is private; all are free on public repos)

- **Dependency graph**: on. `Dependency Review` fails without it.
- **Dependabot alerts** and **Dependabot security updates**: on.
- **Secret scanning** and **Push protection**: on. This catches a pasted `DATABASE_URL` or `AUTH_SECRET` before it lands in history.
- **Code scanning**: the `codeql.yml` workflow uploads results, so no default setup is needed. Check the Security tab after the first run on `main`.
- **Private vulnerability reporting**: on, so a finding can be reported without a public issue.

**Secrets and environments**

- Keep production secrets (`DATABASE_URL`, `AUTH_SECRET`, OIDC and storage keys) in Vercel project settings, not in GitHub. CI uses placeholders only.
- If a deploy workflow is added later, put its secrets in a protected **environment** (required reviewer, limited to `main`) instead of repository secrets.

**Access**

- Collaborators: least privilege (Write for contributors, Admin only for you). Turn on 2FA for the account or org, and consider requiring it org-wide.
- Deploy keys: none, unless needed, and read-only when needed.
- Review installed GitHub Apps and OAuth apps, and remove any you don't use.

## 3. Account-level and hosting settings

- Vercel: set the production branch to `main`, keep **Deployment Protection** on for previews, and give previews a separate Neon branch, never the production database (see the README).
- Neon: use a separate project or branch for production, and rotate the connection string if it was ever pasted into a PR or chat.

## 4. Keeping it that way

- Changes to `.github/**` are checked by `actionlint` and `zizmor`, and are the highest-risk edits. Have a second person review them once you have one, and add `.github/ @<owner>` to `CODEOWNERS` with a stricter owner if the team grows.
- Dependabot opens grouped weekly PRs for npm packages and for pinned actions. Majors are manual.
- Re-check this page when you rename the repo, move it to an org, or change the default branch.
