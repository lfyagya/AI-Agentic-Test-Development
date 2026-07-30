# Module Context

Status: `DRAFT`

## Identity and evidence

| Field             | Value                                |
| ----------------- | ------------------------------------ |
| Module            | `<kebab-case name>`                  |
| Business owner    | `<person or team>`                   |
| Source references | `<tickets, source paths, API specs>` |
| Last verified     | `<ISO date>`                         |

## Business intent

Describe the user outcome and why failure matters.

## Actors, permissions, and preconditions

| Actor or role | Allowed behavior | Preconditions | Denied behavior |
| ------------- | ---------------- | ------------- | --------------- |

## States and transitions

| Starting state | Action | Expected state | Observable evidence |
| -------------- | ------ | -------------- | ------------------- |

## Technical contract

- Routes:
- API requests and responses:
- Stable selectors:
- Loading and error states:
- External dependencies:

## Test-data lifecycle

- Synthetic data shape:
- Creation mechanism:
- Isolation key:
- Failure-safe cleanup:
- Forbidden data:

## Risks and candidate scenarios

| Risk | Candidate behavior | Suggested Type | Suggested Priority | Evidence |
| ---- | ------------------ | -------------- | ------------------ | -------- |

## Unknowns

| Question | Owner | Blocking? | Resolution |
| -------- | ----- | --------- | ---------- |

## Approval

- [ ] Business behavior matches the authoritative source.
- [ ] Routes, APIs, selectors, and expected outcomes are verified.
- [ ] Data creation and cleanup are safe.
- [ ] Unknowns that affect assertions or safety are resolved.
