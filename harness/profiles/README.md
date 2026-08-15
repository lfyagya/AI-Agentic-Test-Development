# Project Profiles — Layer 3

This repo's complete Cypress configuration lives here. `harness.config.json` at the root is composed
from these files, so a new project starts from zero by writing **one file**: its profile.

```text
adapters/cypress.json       complete Cypress policy — 9 rules, 4 agents, 4 hooks, 3 skills, permissions
projects/_template.json     copy this to start a project
projects/<key>.json         one project's facts (~8 lines)
bin/compose-harness-config.mjs   profile + adapter → harness.config.json
bin/test-compose.mjs             self-check
```

## The split

| Layer | Owns | Changes when |
|---|---|---|
| **`adapters/cypress.json`** | Rules, agent roster, hook wiring, permissions, framework paths, architecture | Policy changes — for *every* Cypress project at once |
| **`projects/<key>.json`** | Identity, owner, language, project name, repo, deliberate overrides | This project differs from the adapter default |

The rule: **if it is the same for every Cypress project, it belongs in `adapters/cypress.json`.** A
selector rule is policy. A repo path is a fact. A profile that has grown a `rules` array has
re-created the problem this split exists to remove.

## Start from zero

Paste [`configure.prompt.md`](configure.prompt.md) into your AI, or copy the template by hand:

```bash
cp harness/profiles/projects/_template.json harness/profiles/projects/<key>.json
```

Fill in `key`, `displayName`, `owner`, `adapter`, `language`, `projectName`, `repo`. Delete the
`overrides` block unless the project genuinely differs. Then compose and generate:

```bash
node harness/profiles/bin/compose-harness-config.mjs --profile harness/profiles/projects/<key>.json --out harness.config.json
```

```bash
npm run harness:sync
```

```bash
npm run harness:check
npm run harness:lock    # lead sign-off — work is blocked until the profile is locked
```

That yields the full four-role roster, every rule enforced at write time, and enabled AI adapters
wired. For a **new empty profile**, verify bootstrap (no specs), then begin intake at
[`docs/START-HERE.md`](../../docs/START-HERE.md):

```bash
npm test
```

```bash
npm run evidence:build
```

Both must pass; on an empty profile `evidence:build` reports `bootstrap`.

This repository's own profile (`projects/cypress-boilerplate.json`) is the **reference
instantiation** — it already includes two active products requirements and smoke specs. Re-compose
it with `npm run harness:compose` as below; do not expect bootstrap here.

## Re-composing this repo

```bash
npm run harness:compose
```

Rewrites `harness.config.json` from `projects/cypress-boilerplate.json`. Follow it with
`npm run harness:sync`.

## Drift protection

```bash
npm run harness:profile:verify
```

Deep-compares the composed config against the live `harness.config.json` and exits non-zero on any
difference, naming the differing paths. **This runs inside `npm run harness:test`**, so a hand-edit
that diverges from the profile fails the suite instead of surviving quietly.

```bash
npm run harness:profile:test
```

The self-check asserts every profile composes, all four roles are present, both required facts are
enforced, overrides beat defaults without clobbering sibling keys, and — most importantly — that **the
EVALUATE gate stays `permissionMode: plan` with no Write, Edit, or Bash**. If an override could hand
the gate write access, the builder could grade its own output and the harness would be theatre. That
assertion is the guard.

## Which AI tools a project uses

`adapters` is a **top-level profile field**, not an override — which tools a team uses is a project
fact, like `owner` and `language`. Four tools are supported: `claude`, `copilot`, `cursor`, `codex`:

```json
"adapters": {
  "claude": { "enabled": true },
  "copilot": { "enabled": false },
  "cursor": { "enabled": true },
  "codex": { "enabled": false }
}
```

Compose and sync, and the disabled adapter's generated files are **removed**: e.g. a Claude+Cursor
team stops carrying `.github/agents/`, `.github/copilot-instructions.md`, `.github/hooks/harness.json`,
and `AGENTS.md`. `overrides.adapters` still works for older profiles.

`claude` and `copilot` stay enabled (cursor/codex off) when the answer is unknown — silence should
degrade to something wired, never to nothing enforced. Composing with **no** adapter enabled is
refused outright: it would emit a config whose rules are all declared and reach no tool.

Ask the team; do not detect. What is installed on one machine is not what the team uses, and the guess
breaks the moment someone joins with a different tool. The question belongs in intake — see
`docs/START-HERE.md` step 1.

**Only Claude Code can refuse a violating write** (its `PreToolUse` hook). Copilot, Cursor, and Codex
get the same rules as guidance, so their real gate is `npm run verify` and the pre-push hook. The full
per-tool matrix is in `docs/architecture/cross-tool-configuration.md`.

## Cypress skills

Official Cypress skills are pinned under `harness/skills/cypress/*` and declared in the adapter
`skills[]` with `roles[]` (which lifecycle agents must load them). `npm run harness:sync` projects
them to exactly two places:

- `.claude/skills/**` when Claude is enabled
- `.agents/skills/**` when Copilot, Cursor, or Codex is enabled (portable)

Refresh the canon from upstream with `npm run harness:skills`, then compose + sync again.

## Changing policy

Edit `adapters/cypress.json`, then:

```bash
npm run harness:compose && npm run harness:sync
```

Hook *scripts* are not policy. `.claude/hooks/*.mjs` is executable engine code; the baseline only
declares which hook runs on which event.

## Known limit

`lanes`, `ci`, `boundaries`, and `thresholds` from the rollout architecture's Layer 3 contract are
deliberately **absent**. Nothing reads them yet, and config that nothing reads drifts silently. Add
each field when a script consumes it.
