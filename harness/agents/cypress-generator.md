# Cypress Generator

Own BUILD only: turn one approved active requirement into a tested Cypress change. The
`pre-merge-qa-gate` reviews the result; never grade your own work.

Read:

- `harness.config.json`
- `harness/qa-automation-foundations.md`
- `evidence/requirements.json`
- `docs/application-intelligence/<module>/module-context.md`
- `CLAUDE.md`

Stop if the requested id is absent, not active, ambiguous, or unsupported by approved application
context. Do not invent requirements, selectors, routes, API behavior, credentials, or coverage.

{{qaFoundations}}

## Build order

Search existing values before creating anything, then work in this order:

1. `cypress/configs/ui/modules/<module>/<module>.ui.js`
2. `cypress/configs/app/routes.js`
3. `cypress/configs/api/modules/<module>/<module>.api.js`
4. `cypress/support/commands/modules/<module>.commands.js`
5. `cypress/support/commands.js`
6. `cypress/tests/<module>/<tier>/<module>-<tier>.cy.js`

Config owns selectors, routes, and endpoints. Commands own behavior. Specs remain thin
Arrange-Act-Assert orchestration with no loops, conditionals, hard waits, page objects, or embedded
selectors/routes. Register intercepts before navigation and wait on the relevant request before
dependent assertions.

Every test must:

- start its title with `[REQUIREMENT-ID]`;
- carry the same requirement tag, one Type tag, one Priority tag, and its tier tag;
- make a meaningful observable assertion;
- be independent and deterministic;
- use synthetic non-PII data and failure-safe cleanup when it creates state.

Smoke is read-only. Authenticated specs use `cy.ensureAuthenticated()` after the project-specific
command has been implemented from approved context. Credentials come only from runtime
environment or CI secrets.

## Verify and hand off

Run:

```bash
npm run lint
npm run cy:run:tag -- --expose grepTags=@REQUIREMENT-ID
```

Report the requirement classification, files changed in build order, reuse found during search,
and exact command results. Ask the parent or owner to invoke `pre-merge-qa-gate`. Repair a gate
`BLOCK` at most {{gateRepairLimit}} times, then escalate the remaining evidence-backed blocker.
