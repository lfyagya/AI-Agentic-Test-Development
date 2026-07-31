# Claude Code Settings Governance

This file documents every intentional decision in `.claude/settings.json` — allowed commands, denied tools, permission mode, and hook allowlist entries. Update this file in the same commit as any change to `settings.json` or `cypress-hook-allowlist.json`. Entries without justification will be removed at the next review.

---

## Permission Mode

**`defaultMode: "plan"`**
Claude operates in plan mode by default, meaning any tool call not explicitly allowed requires user approval before executing. This is the correct default for a shared boilerplate — teams fork this repo and should be able to review what Claude is permitted to do before loosening permissions.

To allow a command without prompting, add it to the `allow` list below. Do not switch `defaultMode` to `auto` globally.

---

## Allowed Commands

| Command pattern            | Reason                                        |
| -------------------------- | --------------------------------------------- |
| `Bash(npm run cy:open*)`   | Run the Cypress interactive runner            |
| `Bash(npm run cy:run*)`    | Run tests headless (all, smoke, tag-filtered) |
| `Bash(npm run lint*)`      | Code quality checks before commit             |
| `Bash(npm run format*)`    | Auto-format changed files                     |
| `Bash(npx cypress*)`       | Direct Cypress CLI access for debugging       |
| `Bash(grep -r* cypress/*)` | Read-only content search inside cypress/      |
| `Bash(find cypress/*)`     | Read-only file discovery inside cypress/      |

All allowed commands are either read-only searches or commands that run the test suite. No write operations are pre-approved.

---

## Denied Tools

**`WebSearch: denied`**
Web search is denied globally because this framework is self-contained — all required knowledge is in the codebase, the docs, and Claude's training. Allowing web search introduces the risk of Claude fetching outdated Cypress documentation, third-party patterns that conflict with this architecture, or content from external sources that may not be trustworthy. If a specific agent needs web access for a valid reason (e.g. fetching a Cypress Cloud run report), that access should be granted in that agent's definition, not globally.

If your team adds a use case that genuinely requires web search (e.g. checking npm package security advisories), add a scoped allow rule and document it here.

---

## Hooks

| Hook event                  | File                             | What it does                                                              |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `UserPromptSubmit`          | `prompt-duplication-guard.mjs`   | Reminds Claude to search before creating new configs or commands          |
| `PreToolUse` (Edit\|Write)  | `pre-validate-cypress-rules.mjs` | Blocks a file write if it contains rule violations                        |
| `PostToolUse` (Edit\|Write) | `validate-cypress-rules.mjs`     | Catches violations that passed the pre-check (safety net)                 |
| `Stop`                      | `session-end-reminder.mjs`       | Prints the pre-merge checklist when the session ends with Cypress changes |

Both pre and post validation hooks share rules via `shared-rules.mjs`. To add a new rule, edit `shared-rules.mjs` only — it applies to both hooks automatically.

---

## Allowlist Governance

## Format

```text
selector|route|endpoint: <value>
Owner: <team or file>
Reason: <why this literal is acceptable>
Review date: <YYYY-MM-DD>
Removal condition: <when this can be removed>
```

---

## Current Allowlist Entries

### Selectors

**`body`**
Owner: framework core
Reason: `cy.get('body')` is used in framework-level checks for global page state (e.g., loading indicators, modal overlays). This is a structural element, not a feature selector.
Review date: 2026-07-01
Removal condition: Never — this is a permanent framework exception.

**`html`**
Owner: framework core
Reason: `cy.get('html')` is used in a11y and viewport assertions at the document root level.
Review date: 2026-07-01
Removal condition: Never — permanent framework exception.

### Routes

**`/`**
Owner: framework core
Reason: `cy.visit('/')` navigates to the application root before feature navigation. This is the standard entry point for all tests.
Review date: 2026-07-01
Removal condition: If base URL changes are all handled via config, this may be removed.

---

## Review Policy

- Review all entries every 6 months
- Any entry older than 12 months without a clear permanent justification is a candidate for removal
- Allowlist changes require a PR with this governance file updated in the same commit
