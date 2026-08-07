<!-- GENERATED FROM harness.config.json — DO NOT EDIT. Change harness.config.json, then run npm run harness:sync. npm run harness:check fails on drift. -->

# GitHub Copilot Instructions — cypress-automation-boilerplate

Architecture: **Config → Commands → Tests**. Read `CLAUDE.md` for the full framework contract and
`docs/application-intelligence/<module>/module-context.md` for what the application does.

## Non-negotiable rules

- **no-hard-wait** (Hook + CI) — never cy.wait(<number>); use cy.apiWait('@alias') or a state-based assertion. A fixed wait masks the real timing bug and fails on slower CI machines.
- **no-hardcoded-selector** (Hook + CI) — never a selector literal in a spec or command; use constants from cypress/configs/ui/**. One app change should mean one config edit, not a hunt through 50 specs.
- **no-hardcoded-route** (Hook + CI) — never a URL literal in cy.visit(); use constants from cypress/configs/app/routes.js. Routes change; a central registry keeps every caller correct.
- **no-page-object** (Hook + CI) — never *.actions.js files or page-object wrappers; use custom cy.* commands — command-first only. Commands are the page methods; a second abstraction layer duplicates ownership.
- **require-auth-command** (Hook + CI) — never an auth-required spec without an auth call; use cy.ensureAuthenticated() in beforeEach(), or the module's own auth command plus the // @no-ensureAuthenticated pragma. Session setup belongs in one place, not repeated per test.
- **no-credential-literal** (Hook + CI) — never a password, secret, API key or token assigned a literal string; use cy.env([...]) reading cypress.env.json (gitignored) or a CI secret. Trust boundary. A committed credential is a breach, not a style issue.
- **smoke-read-only** (Hook + CI) — never POST/PUT/PATCH/DELETE in a smoke spec; use read-only assertions; put mutations in the e2e tier. Smoke runs against shared and production-like environments.
- **search-before-create** (QA gate) — never a new config, command or spec without searching first; use grep the literal selector/endpoint/route across configs and commands — search by value, not filename. A filename check that finds nothing is not a value check that finds nothing. Duplicate owners are the most common review failure.
- **one-requirement-tag** (QA gate) — never a spec with no requirement tag, or more than one; use exactly one known requirement id in the title and as a tag, plus Type, Priority, and tier tags. The title survives every reporter and the tag supports filtering; together they make coverage computable.

Edit and Write tool calls are checked by the generated repository hooks. CI rescans repository
changes as the final backstop; shell commands are not represented as Edit or Write tool calls.

## Agents

- `project-bootstrapper` (GATHER) — Start a new project or module from no existing automation context
- `cypress-discovery` (DISCOVER) — Observe an unknown module and turn what you see into config constants
- `cypress-generator` (BUILD) — Build a module from a requirement id — config → commands → spec
- `cypress-bug-hunter` (DIAGNOSE) — Debugging a failing test locally
- `pre-merge-qa-gate` (EVALUATE) — Evaluate supplied diff and verification evidence — PASS / PASS_WITH_ACTIONS / BLOCK
- `pr-creator` (SHIP) — Opening a pull request with a generated description
- `workflow-maintainer` (MAINTAIN) — Simplify workflow scripts, agents, or docs

Read/search only by design: the gate cannot edit files or execute shell commands, so the builder never grades its own output.

## Where things live

| Layer | Path |
|---|---|
| Config | `cypress/configs` |
| Commands | `cypress/support/commands` |
| Tests | `cypress/tests/**/*.cy.{js,ts}` |
