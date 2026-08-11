# Hooks Explainer — The 5W Guide

> **This is a concept + how-to doc.** If your team is confused about what hooks are, why they exist, when they fire, and when they don't apply — read this first. It uses no assumed knowledge.

---

## What Is a Hook? (Plain English)

A **hook** is a piece of code that runs automatically at a specific moment in a workflow — without you asking for it.

In this framework, hooks are Node.js scripts that Claude Code runs at key moments during an AI-assisted session. They sit between Claude's intent and the file system, silently watching and enforcing rules.

Think of them as the framework's immune system: they catch bad patterns before they reach your codebase.

---

## The 5W Breakdown

### Who runs the hooks?

**Claude Code** — the AI agent inside VS Code (not Cypress, not Node, not you).

Hooks only fire when Claude Code is active in this repository. If a human types code directly in a file and saves it, hooks do **not** run. Hooks are an AI guardrail, not a human linter. For human-side enforcement, use `npm run lint` and the pre-merge checklist.

---

### What do the hooks do?

This framework has four hooks. Each has a single, specific job:

| Hook file                        | When it fires                        | What it does                                                                                                                        |
| -------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `prompt-duplication-guard.mjs`   | When you submit a prompt to Claude   | Detects if you're asking Claude to create a new config, command, or spec — and reminds Claude to search for an existing match first |
| `pre-validate-cypress-rules.mjs` | Before Claude writes or edits a file | Scans the proposed content for rule violations and **blocks** the write if any are found                                            |
| `validate-cypress-rules.mjs`     | After Claude writes or edits a file  | Safety net scan of the actual written content — prints a warning if a violation slipped through                                     |
| `session-end-reminder.mjs`       | When Claude finishes a session       | Checks `git status` — if Cypress files changed, prints the pre-merge checklist                                                      |

The pre-write hook **blocks**. The post-write hook **warns**. Together they create a two-layer safety net.

---

### Why do hooks exist?

Because AI writes fast — and fast writing without guardrails produces the exact problems this framework was built to prevent.

Without hooks, Claude could:

- Write `cy.wait(3000)` instead of `cy.apiWait('@alias')` — flaky test
- Hardcode `cy.get('.btn-primary')` instead of using a config constant — brittle selector
- Create a second `payments.commands.js` when one already exists — duplication debt
- Import from a `*.actions.js` file that no longer follows the architecture

Hooks turn these from "things engineers must remember to check" into "things that are automatically caught before the code lands".

They also protect the codebase when **less experienced team members** use Claude — they do not need to know all the rules for the rules to be enforced.

---

### Where do hooks live?

```text
.claude/
├── settings.json                    ← Declares which hooks fire at which event
└── hooks/
    ├── shared-rules.mjs             ← The rule definitions shared by pre and post hooks
    ├── cypress-hook-allowlist.json  ← Explicit exceptions to hook rules
    ├── cypress-hook-allowlist-governance.md  ← Documents every exception and why
    ├── prompt-duplication-guard.mjs
    ├── pre-validate-cypress-rules.mjs
    ├── validate-cypress-rules.mjs
    └── session-end-reminder.mjs
```

The event-to-hook wiring is in `.claude/settings.json`:

```json
"hooks": {
  "UserPromptSubmit": [ "prompt-duplication-guard.mjs" ],
  "PreToolUse (Edit|Write)": [ "pre-validate-cypress-rules.mjs" ],
  "PostToolUse (Edit|Write)": [ "validate-cypress-rules.mjs" ],
  "Stop": [ "session-end-reminder.mjs" ]
}
```

---

### When do hooks fire? (The event lifecycle)

```
You type a prompt
        ↓
[UserPromptSubmit] → prompt-duplication-guard.mjs runs
        ↓
Claude reasons and decides to write a file
        ↓
[PreToolUse: Edit|Write] → pre-validate-cypress-rules.mjs runs
  → If violations found: WRITE IS BLOCKED. Claude must fix first.
  → If clean: write proceeds.
        ↓
File is written to disk
        ↓
[PostToolUse: Edit|Write] → validate-cypress-rules.mjs runs
  → If violations found: warning printed (not a block at this stage).
        ↓
Claude finishes the session
        ↓
[Stop] → session-end-reminder.mjs runs
  → If any cypress/ files changed: pre-merge checklist is printed.
```

---

## What Rules Do the Hooks Enforce?

Rules are defined in `shared-rules.mjs` and apply to all `.cy.js`, `.commands.js`, and `.js` files inside `cypress/`.

| Rule                   | What is detected                                                      | Why                                                                          |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| No hard waits          | `cy.wait(3000)` — any numeric argument                                | Hard waits mask timing problems; they make tests pass locally and fail in CI |
| No actions imports     | `from '...*.actions.js'`                                              | Action class architecture is forbidden in this framework                     |
| No page-object imports | Imports from paths containing `page-obj`, `pageobject`, `page-object` | Same reason — command-first replaces page objects                            |
| Hardcoded selectors    | CSS classes, IDs, tag selectors in `cy.get()`                         | Selectors must come from config constants                                    |
| Hardcoded endpoints    | Raw `/api/...` strings in intercepts                                  | Endpoints must come from API config constants                                |

---

## When Are Hooks NOT Useful?

Hooks do not help — and should not be expected to help — in these situations:

**1. Human-written code**
Hooks only fire during Claude Code sessions. If a developer writes `cy.wait(2000)` manually and commits it, no hook fires. Use `npm run lint` and the CI validator (`node .claude/hooks/validate-cypress-rules.mjs --base-ref main`) for human-written code.

**2. Non-Cypress files**
The hook scanner targets `cypress/**/*.js` files only. Changes to `package.json`, `cypress.config.js`, docs, or any file outside `cypress/` are not scanned.

**3. Deliberate exceptions**
Some literal values are legitimate (e.g. `cy.get('body')` for global page state checks). These are listed in `cypress-hook-allowlist.json`. If you get a false positive, add the value to the allowlist and document the reason in `cypress-hook-allowlist-governance.md`. Do not modify the rule itself.

**4. Copilot and Cursor (write-time)**
The same pre-write script runs under Claude (`PreToolUse`), Copilot (`.github/hooks` `PreToolUse`,
exit 2 denies), and Cursor (`.cursor/hooks.json` `preToolUse`, exit 2 denies). Codex has no hook
API. Human edits and any missed hook still rely on `npm run verify` / pre-push / CI.

**5. Framework-internal files**
`cypress/support/core/api/` (the API engine) contains intentional technical patterns that may look like violations. These files are not test code — they are framework internals. The `TARGET_FILE_RE` regex in `shared-rules.mjs` is designed to exclude them, but if you modify core files, verify the scanner does not flag legitimate patterns.

---

## How to Add a New Rule

1. Open `.claude/hooks/shared-rules.mjs`
2. Add a call to `scanForRegex()` following the pattern of existing rules
3. The rule automatically applies to **both** the pre-write block and the post-write warning — you do not need to edit both hook files

```javascript
// Example: add a rule blocking cy.contains() with hard-coded strings
scanForRegex(
  violations,
  normalized,
  content,
  /cy\.contains\(['"][^'"]{3,}['"]\)/g,
  "Hardcoded text in cy.contains(). Use a config constant or data attribute instead.",
);
```

4. If the rule produces false positives for valid patterns, add exceptions to `cypress-hook-allowlist.json` and document them in `cypress-hook-allowlist-governance.md`.

---

## How to Run Hooks in CI (Without Claude)

The post-write validator doubles as a CI linter:

```bash
node .claude/hooks/validate-cypress-rules.mjs --base-ref main
```

This diffs `HEAD` against `origin/main`, reads every changed Cypress file, and exits non-zero if violations are found. Wire it into your GitHub Actions workflow to catch violations before they merge.

See [docs/guides/ci-cd-guide.md](ci-cd-guide.md) for full pipeline setup.

---

## Quick Reference

| Question                                                | Answer                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Do hooks run when I write code manually?                | No — only during Claude Code sessions                                     |
| Do hooks run in Copilot (VS Code)?                      | No — Copilot uses instruction files instead                               |
| What happens when a hook blocks a write?                | Claude sees the error and must fix the violation before the file is saved |
| Can I bypass a hook permanently for a legitimate value? | Yes — add it to `cypress-hook-allowlist.json` with a documented reason    |
| Can I bypass a hook temporarily in an emergency?        | Yes — but document it in the allowlist immediately after                  |
| Where do I add a new rule?                              | `shared-rules.mjs` only — one place, applies everywhere                   |
| How do I run hook validation without Claude?            | `node .claude/hooks/validate-cypress-rules.mjs --base-ref main`           |
