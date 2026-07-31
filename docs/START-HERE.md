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
npm run verify
```

`verify` is the whole gate chain: `harness:check` → `harness:test` → `harness:format:check` →
`check:rules` → `npm test` (with `lint` via `pretest`) → `evidence:build`. Run them individually to
isolate a failure.

`npm test` must succeed with “No specs yet.” `evidence/metrics.json` must report
`status: "bootstrap"` and unavailable metrics—not fabricated zeroes.

**No CI required.** The write-time hooks are the primary enforcement and cost nothing; CI is a
backstop for human-authored code, since hooks only fire in Claude Code sessions. To run the gates
automatically before every push, enable the shipped hook — no dependency, just core git:

```bash
git config core.hooksPath .githooks
```

Without CI you lose only M2, which measures CI itself and so reports `null` with a reason rather than
pretending. M1, M3, M4 and M5 all work with no pipeline.

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

### Recording M1, M2, and M4

M5 is automatic and M3 accrues from run history. The other three read JSONL ledgers that must be
appended. Use the recorder — it validates every field, so a typo cannot silently understate a metric:

```bash
npm run evidence:record -- gate --requirement PAY-CHECKOUT-001 --attempt 1 --verdict PASS
```

```bash
npm run evidence:record -- effort --requirement PAY-CHECKOUT-001 --minutes 45
```

```bash
npm run evidence:record -- ci --pipeline 4242 --trigger pr --attempt 1 --outcome passed
```

Record the gate verdict **after** step 4. `pre-merge-qa-gate` cannot record its own verdict — it has
no Write and no Bash by design, so the thing being measured never writes its own scorecard.

`--verdict` is `PASS`, `PASS_WITH_ACTIONS`, or `BLOCK`. Add `--failure-class ENV` to a failed CI row
so an infrastructure outage is not counted as a test failure. Add `--accepted false` to effort spent
on a scenario that was not accepted.

**Only `attempt: 1` counts** toward M1 and M2. Measuring after repairs measures persistence, not
quality. The recorder refuses a duplicate `gate` or `ci` row for the same id and attempt, because a
double append would inflate the metric; `--force` overrides it if the second observation is genuinely
separate.

CI records its own row automatically (see the workflow). **That row reaches the uploaded artifact but
does not persist to the tracked ledger** — the job writes to a throwaway checkout. For a durable M2,
either add a commit-back job on `main` or backfill periodically from the Actions API.

These three ledgers are tracked in git. They are the durable record; run outputs are not.

## Definition of complete

- Project and module contracts are approved and source-linked.
- Every active requirement has an independently accepted test or is visibly uncovered.
- Tests pass for the intended reason and clean up created state.
- CI retains the human report and machine evidence.
- `metrics.json` contains computed values or explicit evidence gaps.
- Optional paid integrations are enhancements, never baseline dependencies.
