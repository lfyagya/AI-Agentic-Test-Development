# Start Here — From No Project to Test Metrics

This repository intentionally contains no application, requirements, selectors, credentials, or
tests. The harness derives project-specific automation only from verified sources.

## Lifecycle

| Stage       | Owner                          | Input                                   | Output                                              | Exit condition                |
| ----------- | ------------------------------ | --------------------------------------- | --------------------------------------------------- | ----------------------------- |
| 0. Verify   | Team member                    | Clean clone                             | Healthy empty harness                               | Local checks pass             |
| 1. Gather   | `project-bootstrapper` + owner | Source, requirements, environment facts | Approved project/module context                     | Safety and ownership approved |
| 2. Specify  | `project-bootstrapper` + owner | Approved module context                 | Active requirements in `evidence/requirements.json` | P0/P1/P2 catalog approved     |
| 3. Build    | `cypress-generator`            | One active requirement id               | Config → Commands → Test                            | Focused test executed         |
| 4. Review   | `pre-merge-qa-gate`            | Diff and command evidence               | PASS, PASS_WITH_ACTIONS, or BLOCK                   | Independent gate accepts      |
| 5. Execute  | Cypress + CI                   | Accepted tests                          | HTML and JSON report                                | Required lane passes          |
| 6. Diagnose | `cypress-bug-hunter`           | Failed run evidence                     | Root cause and bounded repair                       | Failure resolved or escalated |
| 7. Measure  | Evidence script                | Reporter JSON + registries              | Run summary, coverage, metrics                      | Gaps are explicit             |

## 0. Verify the empty harness

```bash
npm ci
npm run harness:check
npm run harness:test
npm run check:rules
npm run lint
npm test
npm run evidence:build
```

`npm test` must succeed with “No smoke specs yet.” `evidence/metrics.json` must report
`status: "bootstrap"` and unavailable metrics—not fabricated zeroes.

## 1. Gather verified project context

Invoke `project-bootstrapper` with:

```text
Start project intake for <project>.
Application source: <repository path or URL>
Requirement source: <tracker/specification/owner>
Known environments: <dev/qa/staging/prod>
Do not generate tests. Record unknowns and stop for approval where safety or expected behavior is unclear.
```

The agent creates:

- `docs/application-intelligence/project-context.md`
- `docs/application-intelligence/<module>/module-context.md`
- verified entries in `evidence/requirements.json`

Use the templates under `docs/application-intelligence/_template/`. Never put credentials, PII,
payment data, or production records in these files.

Do not proceed until the owner approves environment mutation rules, authentication, selector
strategy, synthetic data creation/cleanup, and at least one module contract.

## 2. Approve the requirement catalog

Each active requirement must contain:

- unique id, module, source, and observable title;
- acceptance criteria, preconditions, and expected outcome;
- `SMOKE` or `REGRESSION`;
- `P0`, `P1`, or `P2`;
- framework tier: `smoke`, `e2e`, or `ddt`;
- `status: "active"`.

Automate P0 first. Keep unclear requirements in `draft`.

## 3. Build one requirement

Invoke `cypress-generator` with one active id:

```text
Build requirement PAY-CHECKOUT-001. Use the approved application context and run the focused test.
```

The generator follows:

```text
cypress/configs/ui/** → routes/API config → cypress/support/commands/** → cypress/tests/**
```

Every title starts with `[REQUIREMENT-ID]`; tags include the same id, Type, Priority, and tier.
Smoke remains read-only.

## 4. Run the independent gate

Supply `pre-merge-qa-gate` with the changed files and exact output from:

```bash
npm run harness:check
npm run harness:test
npm run check:rules
npm run lint
npm run cy:run:tag -- --expose grepTags=@PAY-CHECKOUT-001
```

The gate is read-only and grades every changed test. A score of 80/100 is necessary but cannot
override a safety or architecture blocker.

## 5. Execute the lanes

```bash
npm run cy:run:smoke
npm run cy:run:e2e
```

- Pull requests: minimal P0 smoke.
- Main/nightly: approved regression coverage.
- Production: read-only smoke only.
- Cypress Cloud: optional; recording activates only when both Cloud secrets exist.

## 6. Build evidence and metrics

After execution:

```bash
npm run evidence:build
```

Outputs:

```text
evidence/
  requirements.json
  runs/<run-id>/run-summary.json
  coverage-computed.json
  metrics.json
```

The script normalizes `cypress/reports/html/index.json`. Requirement IDs come from the test-title
prefix because the Mochawesome JSON does not preserve Cypress grep tags.

Metrics:

- M1 accepted-test rate — requires `gate-log.jsonl`.
- M2 first-pass CI rate — requires `ci-history.jsonl`.
- M3 new-test flake rate — requires five unchanged-code observations.
- M4 QA effort per accepted scenario — requires `effort-log.jsonl`.
- M5 requirement-to-test coverage — automatic from active requirements and the latest run.

Unavailable inputs produce `null` with a reason. They never become misleading zeroes.

Optional JSONL records:

```json
{"requirementId":"PAY-CHECKOUT-001","attempt":1,"verdict":"PASS","timestamp":"<ISO>"}
{"pipelineId":"<id>","trigger":"pr","attempt":1,"outcome":"passed","failureClass":null}
{"requirementId":"PAY-CHECKOUT-001","minutes":45,"accepted":true}
```

## Definition of complete

- Project and module contracts are approved and source-linked.
- Every active requirement has an independently accepted test or is visibly uncovered.
- Tests pass for the intended reason and clean up created state.
- CI retains the human report and machine evidence.
- `metrics.json` contains computed values or explicit evidence gaps.
- Optional paid integrations are enhancements, never baseline dependencies.
