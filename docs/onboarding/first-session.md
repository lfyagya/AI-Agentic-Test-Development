# First Team Session — `cypress-automation-boilerplate`

Kickoff visual brief. Date: 2026-08-14 · Repo: `github.com/lfyagya/cypress-automation-boilerplate` · Branch: `main`.

Every diagram below traces to a file in this repo:
state to `evidence/requirements.json`, `evidence/gate-log.jsonl`, and `docs/application-intelligence/**`;
rules/roster to `harness.config.json`; enforcement/CI to `.github/workflows/*.yml` and `docs/START-HERE.md`.

---

## 1. What we have today (state snapshot)

```mermaid
flowchart TD
    R["cypress-automation-boilerplate v2.0.0<br/>branch: main · clean"]
    R --> T["Target app<br/>Automation Exercise<br/>automationexercise.com<br/>public · third-party · no source here"]
    R --> M["Active module: products<br/>(only one)"]
    M --> Q1["AE-PRODUCTS-001<br/>API catalog<br/>SMOKE · P0 · read-only"]
    M --> Q2["AE-PRODUCTS-002<br/>Products listing UI<br/>SMOKE · P0 · read-only"]
    Q1 --> S1["spec: products-smoke.cy.js"]
    Q2 --> S2["spec: products-listing.cy.js"]
    S1 --> G["QA gate: PASS_WITH_ACTIONS<br/>attempt 1 · 2026-08-13"]
    S2 --> G

    style R fill:#e8f0fe,stroke:#4285f4,color:#111
    style T fill:#fef7e0,stroke:#f9ab00,color:#111
    style G fill:#e6f4ea,stroke:#34a853,color:#111
```

---

## 2. Architecture — one direction only

```mermaid
flowchart LR
    C["configs/<br/>selectors · routes · endpoints"] --> Cmd["support/commands/<br/>navigation · intercepts · assertions"] --> Test["tests/<br/>one behavior · orchestration"]
    Test -. "never reaches past commands (refused)" .-> C

    style C fill:#e8f0fe,stroke:#4285f4,color:#111
    style Cmd fill:#fce8e6,stroke:#ea4335,color:#111
    style Test fill:#e6f4ea,stroke:#34a853,color:#111
```

---

## 3. How work flows + who does each step

```mermaid
flowchart LR
    G["GATHER<br/>project-bootstrapper"] --> S["SPECIFY<br/>human approves"]
    S --> B["BUILD<br/>cypress-generator<br/>1 requirement"]
    B --> E{"EVALUATE<br/>pre-merge-qa-gate<br/>read-only"}
    E -- BLOCK (max 3) --> B
    E -- PASS --> X["EXECUTE<br/>cypress"]
    X -- fail --> D["DIAGNOSE<br/>cypress-bug-hunter"]
    D --> B
    X -- pass --> Me["MEASURE<br/>evidence"]
    Me --> Sh["SHIP<br/>pr-creator"]

    style S fill:#e6f4ea,stroke:#34a853,color:#111
    style E fill:#fef7e0,stroke:#f9ab00,color:#111
    style D fill:#fce8e6,stroke:#ea4335,color:#111
```

---

## 4. The 9 rules at a glance

```mermaid
flowchart TB
    subgraph BLOCK["8 BLOCKING (write refused / CI blocks)"]
        r1["no-hard-wait<br/>no cy.wait(number)"]
        r2["no-hardcoded-selector<br/>use configs/ui/**"]
        r3["no-hardcoded-route<br/>use routes.js"]
        r4["no-page-object<br/>commands only"]
        r5["require-auth-command<br/>ensureAuthenticated()"]
        r6["no-credential-literal<br/>use cy.env()"]
        r7["smoke-read-only<br/>no writes in smoke"]
        r8["one-requirement-tag<br/>exactly 1 req id"]
    end
    subgraph GRADED["1 GRADED"]
        r9["search-before-create<br/>grep by value first"]
    end

    style BLOCK fill:#fce8e6,stroke:#ea4335,color:#111
    style GRADED fill:#fef7e0,stroke:#f9ab00,color:#111
```

---

## 5. Enforcement reality (important caveat)

```mermaid
flowchart TD
    AI["Claude Code write"] --> Hook{"PreToolUse hook"}
    Hook -- violation --> Refuse["REFUSED before disk"]
    Other["Cursor · Copilot · Codex"] --> Guide["rules = guidance only"]
    Guide --> Floor
    Human["Human edit"] --> Floor["npm run verify + pre-push<br/>(the real floor)"]
    Floor --> CI{"CI"}
    CI --> Off["AUTO TRIGGERS OFF<br/>account billing-locked<br/>manual dispatch only"]

    style Refuse fill:#fce8e6,stroke:#ea4335,color:#111
    style Floor fill:#fef7e0,stroke:#f9ab00,color:#111
    style Off fill:#fce8e6,stroke:#ea4335,color:#111
```

---

## 6. Evidence / metrics — what is fed vs empty

```mermaid
flowchart LR
    subgraph HAVE["Tracked & present"]
        h1["requirements.json<br/>2 active"]
        h2["gate-log.jsonl<br/>2 rows → M1 started"]
    end
    subgraph MISSING["Not present yet"]
        m1["ci-history.jsonl → M2 unavailable"]
        m2["effort-log.jsonl → M4 unavailable"]
    end
    note["Missing = 'unavailable', never a fake 0"]

    style HAVE fill:#e6f4ea,stroke:#34a853,color:#111
    style MISSING fill:#f1f3f4,stroke:#9aa0a6,color:#111
```

---

## 7. Open decisions for the team

```mermaid
flowchart TD
    O["Decide today"]
    O --> a["Confirm accountable owner<br/>(currently pending)"]
    O --> b["CI billing → restore auto PR/push"]
    O --> c["Private/staging mirror? (none provided)"]
    O --> d["Synthetic account lifecycle<br/>(blocks future auth/mutation E2E)"]
    O --> e["Next requirements to promote to active"]

    style O fill:#e8f0fe,stroke:#4285f4,color:#111
```

---

## 8. Project profile (what defines this project)

Facts below are from `harness/profiles/projects/cypress-boilerplate.json`. This ~8-line profile is the
only project-specific input; all rules/roster/policy come from `harness/profiles/adapters/cypress.json`.
The profile composes → `harness.config.json` → projections for each enabled tool.

```mermaid
flowchart LR
    P["Project profile<br/>cypress-boilerplate.json<br/>key · displayName · owner · adapter · language · adapters[]"]
    A["Adapter baseline<br/>adapters/cypress.json<br/>rules · roster · hooks · permissions"]
    P -- harness:compose --> CFG["harness.config.json"]
    A -- harness:compose --> CFG
    CFG -- harness:sync --> Proj["Claude · Copilot · Cursor · Codex projections"]

    style P fill:#e8f0fe,stroke:#4285f4,color:#111
    style A fill:#fef7e0,stroke:#f9ab00,color:#111
    style CFG fill:#e6f4ea,stroke:#34a853,color:#111
```

| Field | Value |
| --- | --- |
| key | `cypress-boilerplate` |
| displayName | Cypress Automation Boilerplate |
| profile owner | `cypress-harness-maintainers` (harness maintainers — **not** the app owner) |
| adapter / language | `cypress` / `javascript` |
| projectName / repo | `cypress-automation-boilerplate` |
| enabled AI tools | Claude · Copilot · Cursor · Codex (all `true`) |

> Two different "owners": profile owner above = harness maintainers; the **application accountable
> owner** is Yagya Bhatta — pending formal confirmation (`docs/application-intelligence/project-context.md`).

---

## 9. One representative per project (nominate today)

The repo carries no roster of people — fill these in live during the session. No names are assumed.

```mermaid
flowchart TB
    subgraph NOM["Nominate 1 representative per project"]
        p1["Project: cypress-automation-boilerplate<br/>Representative: __________<br/>Backup: __________"]
        p2["Project: __________<br/>Representative: __________<br/>Backup: __________"]
    end
    role["Representative owns:<br/>• speaks for the project in syncs<br/>• approves requirements → active<br/>• first point of contact for the project"]

    style NOM fill:#e8f0fe,stroke:#4285f4,color:#111
    style role fill:#f1f3f4,stroke:#9aa0a6,color:#111
```

---

## 10. How / who to reach — progress & blockers

Channels and owners are not in the repo — agree and record them in the session (placeholders shown).

```mermaid
flowchart TD
    M["Team member has an update"]
    M --> PR{"Progress or Blocker?"}
    PR -- Progress --> Prog["Post in: [progress channel]<br/>Cadence: [daily/weekly]<br/>Format: what shipped + what's next"]
    PR -- Blocker --> Rep["Ping: Project representative (§9)"]
    Rep --> Esc{"Resolved?"}
    Esc -- No --> Owner["Escalate: accountable owner<br/>(Yagya Bhatta — pending)"]
    Esc -- Yes --> Done["Record outcome in [tracker]"]

    Note["Also: unclear behavior/conflict → agents STOP and report<br/>(source-precedence rule, docs/START-HERE.md)"]

    style M fill:#e8f0fe,stroke:#4285f4,color:#111
    style Rep fill:#fef7e0,stroke:#f9ab00,color:#111
    style Owner fill:#fce8e6,stroke:#ea4335,color:#111
```

Fields to fill in during the session:

| What | Value (to agree) |
| --- | --- |
| Progress channel + cadence | __________ |
| Blocker / escalation channel | __________ |
| Issue tracker / board | __________ |
| Project representative(s) | __________ (see §9) |
| Accountable owner (confirm) | Yagya Bhatta — pending |

---

## Suggested agenda

1. Repo purpose + Config → Commands → Tests (§2) — 10 min
2. Current state: products module, 2 requirements, 2 passing specs (§1) — 10 min
3. Project profile — what defines this project (§8) — 5 min
4. The 9 rules and why (§4) — 10 min
5. Enforcement reality: Claude-only write blocking; CI manual-only now (§5) — 5 min
6. Local setup + `npm run verify` live — 10 min
7. Nominate one representative per project (§9) — 5 min
8. Agree how/who to reach for progress & blockers (§10) — 10 min
9. Open decisions and owners (§7) — 10 min
