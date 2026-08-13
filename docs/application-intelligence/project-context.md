# Project Context

Status: `VERIFIED` (products API scope) · `DRAFT` (UI and auth scope)

## Ownership and sources

| Field                  | Value                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Project                | Automation Exercise (demo target under test)                   |
| Accountable owner      | QA automation team (harness maintainers)                       |
| Application repository | Third-party public demo — no source access                     |
| Requirement source     | `https://automationexercise.com/api_list` (published API list) |
| API/schema source      | `https://automationexercise.com/api_list` (no OpenAPI/Swagger) |
| Last verified          | 2026-08-13                                                     |

## Environments and safety

| Environment | Base URL                         | Data class         | Allowed operations                          | Approval |
| ----------- | -------------------------------- | ------------------ | ------------------------------------------- | -------- |
| Production  | `https://automationexercise.com` | Shared public demo | Read-only smoke (GET product/brand catalog) | Harness  |
| Development | `<none — single public site>`    | Shared public demo | Synthetic account create/delete for E2E     | Harness  |
| QA          | `<none — single public site>`    | Shared public demo | Synthetic account create/delete for E2E     | Harness  |

Supply `baseUrl` at runtime through `cypress.env.json` (gitignored) or the `BASE_URL` CI secret, as
`.github/workflows/cypress.yml` already does. The read-only product/brand catalog smoke calls the
documented absolute API endpoints directly and does not require `baseUrl`.

## Contracts to verify

- Authentication and roles: UI `Signup / Login`; API `POST /api/verifyLogin` (email, password),
  `POST /api/createAccount`, `DELETE /api/deleteAccount`. No shared credential — each run registers a
  synthetic account. Auth scope is not yet built (deferred to the E2E slice).
- Stable selector attribute: none. The site uses semantic CSS classes/ids (for example
  `.features_items`, `.productinfo`), not `data-*` hooks. UI selectors are unverified until the UI slice.
- Supported browsers: Chrome (verified 148) and bundled Electron.
- API dependencies: `GET /api/productsList` and `GET /api/brandsList` return HTTP `200` with a JSON
  body carrying a `responseCode` field and a `products`/`brands` array. Verified live 2026-08-13.
- Test-data creation and cleanup: product/brand reads create no data. The future account E2E must
  register a synthetic user via `createAccount` and remove it via `deleteAccount` (failure-safe).
- External integrations: none required for the smoke scope.
- Accessibility or regulatory obligations: none for a public demo.
- CI lanes and branch policy: GitHub Actions `cypress.yml` (smoke on PR, e2e on push) writes
  `cypress.env.json` from repository secrets.

## Modules

| Module     | Business owner | Risk                                   | Context status                   |
| ---------- | -------------- | -------------------------------------- | -------------------------------- |
| `products` | Harness        | Catalog API unavailable → store broken | `VERIFIED` (API); UI/E2E `DRAFT` |

## Unknowns and decisions

| Item                                | Why it matters                           | Owner   | Status                      |
| ----------------------------------- | ---------------------------------------- | ------- | --------------------------- |
| Stable UI selector strategy         | Needed before UI/table specs             | Harness | Open — resolve in UI slice  |
| Synthetic account lifecycle for E2E | Needed before any mutating E2E is active | Harness | Open — resolve in E2E slice |

## Approval

- [x] Sources are authoritative (published API list, verified live).
- [x] Environment and mutation boundaries are approved (read-only smoke only for now).
- [x] Authentication and test-data handling are approved (no auth in smoke scope).
- [x] At least one module is ready for requirement derivation (`products`).
