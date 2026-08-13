# Project Context

Status: `ACTIVE` (products API and listing UI)

## Ownership and sources

| Field                  | Value                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| Project                | Automation Exercise public practice application                              |
| Accountable owner      | Yagya Bhatta — pending formal confirmation                                   |
| Application repository | Third-party public site; no first-party source in this worktree              |
| Requirement sources    | Published API list, live public application, owner-approved UI listing slice |
| Last verified          | `2026-08-13`                                                                 |

## Environment and safety

| Environment          | Base URL                             | Data class          | Allowed operations                       | Approval              |
| -------------------- | ------------------------------------ | ------------------- | ---------------------------------------- | --------------------- |
| Shared public target | `https://www.automationexercise.com` | Shared demo catalog | Read-only products API and listing smoke | Approved `2026-08-13` |

- `BASE_URL` is public and non-secret. It is configured in `cypress.config.js`, tracked environment
  files, and CI runtime configuration with optional secret/variable overrides.
- The API smoke uses its documented absolute endpoint and does not depend on `baseUrl`.
- No credentials or created test data are needed for `AE-PRODUCTS-001` or `AE-PRODUCTS-002`.
- Any future register/login/delete flow requires a separate active mutating requirement, synthetic
  identity generation, and failure-safe cleanup.

## Verified contracts

- Public products API: `GET /api/productsList` returns HTTP `200`, payload `responseCode: 200`, and
  non-empty `products[]`; active requirement `AE-PRODUCTS-001`.
- Public products UI: `/products` renders `All Products` and a non-empty visible card listing;
  active requirement `AE-PRODUCTS-002`.
- Stable test attributes: none. UI config centralizes verified CSS fallbacks; visible text is used
  where stable.
- Browser evidence: Chrome and bundled Electron runs are supported by the harness; the UI smoke was
  verified in the available browser runtime.

## Mutation policy

- Shared public smoke is read-only.
- Product/brand reads and products listing observation are allowed.
- Cart, search submission, account operations, and other mutations are not active in this scope.

## Modules

| Module     | Risk                                                                         | Context status                         |
| ---------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `products` | API unavailable/malformed; UI page empty; third-party selector/catalog churn | `ACTIVE` — API and listing UI verified |

## Decisions and remaining unknowns

| Item                        | Status                                                         |
| --------------------------- | -------------------------------------------------------------- |
| Catalog count               | Resolved — assert non-empty, not exact count                   |
| UI selector strategy        | Resolved — visible text plus centralized verified CSS fallback |
| Public CI target            | Approved for read-only products checks                         |
| Formal accountable owner    | Pending confirmation                                           |
| Private/staging mirror      | Not provided                                                   |
| Synthetic account lifecycle | Deferred; blocks future mutating auth E2E                      |

## Approval

- [x] Sources are authoritative for the active API/UI scope.
- [x] Environment and mutation boundaries are approved.
- [x] Authentication and test-data handling are safe for read-only smoke.
- [x] Both active requirements have verified contracts and executable tests.
