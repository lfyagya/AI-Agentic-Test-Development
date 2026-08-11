# 0002 — Claude Code Hooks as AI Guardrails

## Status

Accepted

## Context

When AI agents (Claude Code) write Cypress files, they can violate framework rules even when those rules are stated in instructions — because instructions are probabilistic guidance, not hard enforcement. A sufficiently complex prompt or a distracted generation can still produce `cy.wait(3000)`, a hardcoded selector, or a duplicate command file.

Three enforcement approaches were evaluated:

1. **Instructions only** — rules listed in `copilot-instructions.md` and `FRAMEWORK_RULES.md`. The AI reads them and tries to follow them. Violations depend entirely on the model's reliability.
2. **CI-only enforcement** — `validate-cypress-rules.mjs` runs in the pipeline on every PR and blocks merge if violations exist. Rules are caught, but only after the code is written, reviewed, and pushed.
3. **Pre-write hooks** — a Claude Code `PreToolUse` hook intercepts every file write, scans the proposed content before it hits the disk, and blocks the write if violations are found. A `PostToolUse` hook provides a secondary safety net.

## Decision

Use **pre-write and post-write hooks** (option 3) as the primary AI enforcement layer, with CI validation (option 2) as a secondary gate for human-written code and any changes not made through Claude Code.

Instructions (option 1) are kept but treated as guidance, not enforcement.

The hook system is implemented in `.claude/hooks/` with four scripts:

| Hook                             | Event                      | Role                                                                 |
| -------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `prompt-duplication-guard.mjs`   | `UserPromptSubmit`         | Reminds Claude to search before creating                             |
| `pre-validate-cypress-rules.mjs` | `PreToolUse: Edit\|Write`  | Blocks the write on violation                                        |
| `validate-cypress-rules.mjs`     | `PostToolUse: Edit\|Write` | Safety net after write; also doubles as a CI linter via `--base-ref` |
| `session-end-reminder.mjs`       | `Stop`                     | Prints the pre-merge checklist if Cypress files changed              |

Rules are defined once in `shared-rules.mjs` and consumed by both the pre and post hook — no duplication of rule logic.

Legitimate exceptions (e.g. `cy.get('body')` for framework-level checks) are declared in `cypress-hook-allowlist.json` with a required justification in `cypress-hook-allowlist-governance.md`.

## Consequences

**Easier:**

- Rule violations are caught before they exist on disk — no code review cycle required for mechanical rules.
- Less experienced engineers using Claude Code get the same rule enforcement as experts — the guardrail is structural, not knowledge-dependent.
- Adding a new rule means editing one file (`shared-rules.mjs`) — it applies to all hooks and the CI validator simultaneously.
- The CI validator (`--base-ref main`) can scan human-written changes in the pipeline without any additional tooling.

**Harder:**

- Hooks only fire during supported AI-agent sessions (Claude / Copilot / Cursor PreToolUse).
  Human-authored code bypasses the pre-write hook — CI is the gate for those changes.
- The hook system requires Node.js where the agent runs.
- Allowlist exceptions require discipline: every entry must be documented in the governance file or it will be removed at the next review.
- Codex has no hook API; its write-time path is guidance plus the universal floor.

## Update — 31 July 2026

This decision stands, but the mechanism moved. Rules are now declared once in `harness.config.json`
and _generated_ into every adapter by `npm run harness:sync`. Consequently:

- `.github/instructions/*.instructions.md` and `.github/FRAMEWORK_RULES.md` were retired. They were
  hand-maintained restatements of the same rules and drifted from the config.
- Copilot enforcement is now `.github/copilot-instructions.md`, a generated projection.
- `docs/reference/two-views.md` was retired; the human-vs-agent split it described is covered by
  [`docs/START-HERE.md`](../START-HERE.md) and the harness guide.
- `npm run harness:check` fails the build if any projection drifts from the config.

The original trade-off is unchanged for humans and Codex: hooks are deterministic where the tool
exposes PreToolUse; instructions alone remain advisory.

## Update — 12 August 2026

Official Copilot and Cursor hook docs now support denying tool calls before execution (`PreToolUse` /
`preToolUse`, exit code 2). The harness projects the same pre-write scripts there. Codex remains
floor-only. See [`cross-tool-configuration.md`](../architecture/cross-tool-configuration.md).

## What This Is Not

This ADR covers the architectural decision to use hooks. For operational detail — what each hook does, the event lifecycle, how to add a rule, when hooks do not apply — see [docs/guides/hooks-explainer.md](../guides/hooks-explainer.md).
