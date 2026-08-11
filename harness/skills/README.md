# Official Cypress AI skills (canonical)

Pinned from [`cypress-io/ai-toolkit`](https://github.com/cypress-io/ai-toolkit) `skills/`.

| Skill | Upstream path | Role |
|---|---|---|
| `cypress-author` | `skills/cypress-author` | Cypress craft for BUILD / DIAGNOSE |
| `cypress-explain` | `skills/cypress-explain` | Review/explain for EVALUATE / DIAGNOSE |
| `cypress-docs` | `skills/cypress-docs` | Docs grounding for DISCOVER / BUILD / DIAGNOSE |

**Do not edit skill bodies here to invent policy.** Refresh from upstream:

```bash
npm run harness:skills
```

`harness:sync` projects these trees into exactly two locations:

- `.claude/skills/**` — when Claude is enabled
- `.agents/skills/**` — when Copilot, Cursor, or Codex is enabled (portable)

Do not also maintain `.cursor/skills`, `.github/skills`, or `.codex/skills`.
