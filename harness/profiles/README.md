# Project Profiles — Layer 3

This repo's complete Cypress configuration lives here. `harness.config.json` at the root is composed
from these files, so a new project starts from zero by writing **one file**: its profile.

```text
adapters/cypress.json       complete Cypress policy — 9 rules, 7 agents, 4 hooks, permissions
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
```

That yields the full seven-role roster, every rule enforced at write time, and both AI adapters wired
— with no test in the repo. Verify the empty state, then begin intake at
[`docs/START-HERE.md`](../../docs/START-HERE.md):

```bash
npm test
```

```bash
npm run evidence:build
```

Both must pass and `evidence:build` must report `bootstrap`.

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

The self-check asserts every profile composes, all seven roles are present, both required facts are
enforced, overrides beat defaults without clobbering sibling keys, and — most importantly — that **the
EVALUATE gate stays `permissionMode: plan` with no Write, Edit, or Bash**. If an override could hand
the gate write access, the builder could grade its own output and the harness would be theatre. That
assertion is the guard.

## Which AI tools a project uses

`adapters` is a **top-level profile field**, not an override — which tools a team uses is a project
fact, like `owner` and `language`:

```json
"adapters": { "claude": { "enabled": true }, "copilot": { "enabled": false } }
```

Compose and sync, and the disabled adapter's generated files are **removed**: a Claude-only team stops
carrying `.github/agents/`, `.github/copilot-instructions.md`, and `.github/hooks/harness.json`.
`overrides.adapters` still works for older profiles.

Both stay enabled when the answer is unknown — silence should degrade to everything wired, never to
nothing enforced. Composing with **no** adapter enabled is refused outright: it would emit a config
whose rules are all declared and reach no tool.

Ask the team; do not detect. What is installed on one machine is not what the team uses, and the guess
breaks the moment someone joins with a different tool. The question belongs in intake — see
`docs/START-HERE.md` step 1.

**Only Claude Code can refuse a violating write.** Copilot gets the same rules as advisory text, so a
Copilot-only team's real gate is `npm run verify` and the pre-push hook.

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
