# Documentation

**Start with [START-HERE.md](START-HERE.md)** — the complete, self-contained harness guide.
Everything below is supporting detail you reach for only when you need it.

## Reference

| Topic                                       | Document                                                              |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Harness lifecycle contract                  | [harness-lifecycle-spec.md](reference/harness-lifecycle-spec.md)      |
| Framework standards                         | [framework-standards.md](reference/framework-standards.md)            |
| Why configs, commands, and tests are split  | [test-organization.md](reference/test-organization.md)                |
| API intercepts and the API config layer     | [api-layer-guide.md](reference/api-layer-guide.md)                    |

## Guides

| Topic                                       | Document                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| TypeScript — opt-in per file                | [typescript-guide.md](guides/typescript-guide.md)                            |
| Write-time hooks: events, rules, allowlist  | [hooks-explainer.md](guides/hooks-explainer.md)                              |
| Writing custom commands                     | [support-commands-instructions.md](guides/support-commands-instructions.md)  |
| Adding or updating modules                  | [framework-maintenance-guide.md](guides/framework-maintenance-guide.md)     |
| CI pipeline setup                           | [ci-cd-guide.md](guides/ci-cd-guide.md)                                     |

## Project intake

Project and module context templates: [application-intelligence](application-intelligence/README.md).

Application-specific context is created only after intake. The canonical requirement registry is
`evidence/requirements.json`.

## Decisions

An append-only log of significant technical decisions: [decisions](decisions/README.md).
