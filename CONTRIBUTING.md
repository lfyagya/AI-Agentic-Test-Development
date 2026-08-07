# Contributing

This project uses a strict **Config → Commands → Tests** architecture. Every contribution must follow it — the CI pipeline enforces it automatically.

---

## Before You Write Anything

```bash
# 1. Search for existing configs and commands first — do not duplicate
grep -r "data-cy" cypress/configs/ui/
grep -r "alias:" cypress/configs/api/

# 2. Run the existing tests to confirm your baseline is clean
npm run cy:run:smoke
```

If `cy:run:smoke` fails before you touch anything, flag it to the team. Do not start a new contribution on a broken baseline.

---

## The Contribution Flow

```mermaid
flowchart TD
    A(["Start"]) --> B["Search cypress/configs/ and commands/\nbefore creating anything"]
    B --> C{"Something\nalready exists?"}
    C -- Yes --> D["Reuse or extend\nthe existing file"]
    C -- No --> E["Follow the 6-step\nmodule checklist"]
    D --> F["Write or update\nyour test (cypress-generator agent)"]
    E --> F
    F --> G["npm run cy:run:smoke\nVerify locally"]
    G --> H{Pass?}
    H -- No --> I["cypress-bug-hunter agent"]
    I --> G
    H -- Yes --> J["pre-merge-qa-gate agent"]
    J --> K{PASS?}
    K -- BLOCK --> L["Fix flagged issues"]
    L --> G
    K -- Yes --> M(["pr-creator agent\nOpen PR"])
```

---

## The 6-Step Module Checklist

When adding a genuinely new module (confirmed no existing match):

```text
[ ] 1. API Config    cypress/configs/api/modules/[x]/[x].api.js
[ ] 2. UI Config     cypress/configs/ui/modules/[x]/[x].ui.js
[ ] 3. Routes        cypress/configs/app/routes.js
[ ] 4. Commands      cypress/support/commands/modules/[x].commands.js
[ ] 5. Register      cypress/support/commands.js
[ ] 6. Spec          cypress/tests/[x]/smoke/[x]-smoke.cy.js
```

---

## Non-Negotiable Rules

The CI pipeline (`cypress-rules.yml`) blocks merge automatically on any of these:

```
NEVER  cy.wait(number)          — use cy.apiWait('@alias') or .should()
NEVER  hardcoded selectors      — use constants from cypress/configs/ui/**
NEVER  hardcoded URLs           — use constants from cypress/configs/app/routes.js
NEVER  *.actions.js files       — command-first only
NEVER  page-object wrappers     — commands own all logic
NEVER  real credentials in code — use cypress.env.json locally, secrets in CI
```

---

## Pre-Merge Checklist

```text
[ ] Searched existing configs/commands before creating any file
[ ] No hardcoded selectors — all from cypress/configs/ui/**
[ ] No hardcoded URLs — all from cypress/configs/app/routes.js
[ ] No cy.wait(number) — grep returns zero results
[ ] cy.ensureAuthenticated() in beforeEach() of all auth-required specs
[ ] New command registered in cypress/support/commands.js
[ ] npm run cy:run:smoke passes locally
[ ] pre-merge-qa-gate agent returns PASS or PASS_WITH_ACTIONS
```

---

## Setting Up CI Secrets

If you are forking this boilerplate and setting up CI for the first time, add these to **Repository Settings → Secrets and variables → Actions** for each environment (`dev`, `qa`, `prod`):

| Secret             | Value              |
| ------------------ | ------------------ |
| `BASE_URL`         | Your app URL       |
| `CYPRESS_USERNAME` | Test user login    |
| `CYPRESS_PASSWORD` | Test user password |
| `CYPRESS_AUTH_URL` | Auth endpoint path |

See [docs/guides/ci-cd-guide.md](docs/guides/ci-cd-guide.md) for full pipeline setup and AWS CodeBuild adaptation.

---

## Documentation

| What you need                             | Where                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| First time setup, and the whole lifecycle | [docs/START-HERE.md](docs/START-HERE.md)                                                     |
| Architecture rules and why                | [docs/reference/framework-standards.md](docs/reference/framework-standards.md)               |
| Why configs/tests/commands are split      | [docs/reference/test-organization.md](docs/reference/test-organization.md)                   |
| Adding or updating modules                | [docs/guides/framework-maintenance-guide.md](docs/guides/framework-maintenance-guide.md)     |
| Writing commands                          | [docs/guides/support-commands-instructions.md](docs/guides/support-commands-instructions.md) |
| API intercepts                            | [docs/reference/api-layer-guide.md](docs/reference/api-layer-guide.md)                       |
