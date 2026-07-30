# Cypress Harness Instructions

This repository is an empty, application-agnostic QA harness. Do not invent an application,
requirement, selector, route, credential, or expected result.

## Source precedence

1. `harness.config.json` — harness roles, tools, limits, and rules.
2. `harness/qa-automation-foundations.md` — shared test-quality and grading contract.
3. `evidence/requirements.json` — approved requirements.
4. `docs/application-intelligence/**` — verified project and module behavior.
5. `cypress/configs/**` — selectors, routes, and API contracts.
6. `cypress/support/commands/**` — reusable implementation.
7. `cypress/tests/**` — thin executable orchestration.

When sources disagree, stop and report the conflict. Tests do not redefine business behavior.

## Lifecycle

Use `project-bootstrapper` before `cypress-generator` for every new project or module.

```text
GATHER → SPECIFY → BUILD → GUARD → EVALUATE → EXECUTE → DIAGNOSE → MEASURE
```

- GATHER creates verified project/module context and draft requirements.
- The owner approves requirements and promotes them to `active`.
- BUILD accepts exactly one active requirement id.
- EVALUATE is read-only and supplies the merge verdict.
- Repairs are bounded by `loops.gateRepairLimit`.

The complete procedure is [`docs/START-HERE.md`](docs/START-HERE.md).

## Architecture

```text
cypress/configs/** → cypress/support/commands/** → cypress/tests/**
```

- Config owns selectors, routes, endpoints, and immutable constants.
- Commands own navigation, intercepts, interactions, reusable assertions, and cleanup.
- Tests contain one behavior and read as orchestration.
- Every test title begins `[REQUIREMENT-ID]` and carries matching requirement, Type, Priority, and
  tier tags.

## Non-negotiable rules

<!-- HARNESS:RULES:START -->
<!-- Generated from harness.config.json — run `npm run harness:sync`. Do not edit by hand. -->

```text
NEVER  →  cy.wait(<number>)                                                cy.apiWait('@alias') or a state-based assertion
NEVER  →  a selector literal in a spec or command                          constants from cypress/configs/ui/**
NEVER  →  a URL literal in cy.visit()                                      constants from cypress/configs/app/routes.js
NEVER  →  *.actions.js files or page-object wrappers                       custom cy.* commands — command-first only
NEVER  →  an auth-required spec without an auth call                       cy.ensureAuthenticated() in beforeEach(), or the module's own auth command plus the // @no-ensureAuthenticated pragma
NEVER  →  a password, secret, API key or token assigned a literal string   cy.env([...]) reading cypress.env.json (gitignored) or a CI secret
NEVER  →  POST/PUT/PATCH/DELETE in a smoke spec                            read-only assertions; put mutations in the e2e tier
NEVER  →  a new config, command or spec without searching first            grep the literal selector/endpoint/route across configs and commands — search by value, not filename
NEVER  →  a spec with no requirement tag, or more than one                 exactly one known requirement id in the title and as a tag, plus Type, Priority, and tier tags
```

| Rule | Why it exists | Enforcement |
|---|---|---|
| `no-hard-wait` | A fixed wait masks the real timing bug and fails on slower CI machines. | Hook + CI |
| `no-hardcoded-selector` | One app change should mean one config edit, not a hunt through 50 specs. | Hook + CI |
| `no-hardcoded-route` | Routes change; a central registry keeps every caller correct. | Hook + CI |
| `no-page-object` | Commands are the page methods; a second abstraction layer duplicates ownership. | Hook + CI |
| `require-auth-command` | Session setup belongs in one place, not repeated per test. | Hook + CI |
| `no-credential-literal` | Trust boundary. A committed credential is a breach, not a style issue. | Hook + CI |
| `smoke-read-only` | Smoke runs against shared and production-like environments. | Hook + CI |
| `search-before-create` | A filename check that finds nothing is not a value check that finds nothing. Duplicate owners are the most common review failure. | QA gate |
| `one-requirement-tag` | The title survives every reporter and the tag supports filtering; together they make coverage computable. | QA gate |

<!-- HARNESS:RULES:END -->

## Empty state

Zero tests is valid before project intake. `npm test` must pass without launching Cypress, and
`npm run evidence:build` must produce bootstrap metrics with explicit unavailable reasons.

## Verification

```bash
npm run harness:check
npm run harness:test
npm run check:rules
npm run lint
npm test
npm run evidence:build
```

Do not claim execution, coverage, or a metric without the corresponding command or source
evidence. Optional paid services cannot be required for the baseline workflow.
