# Module Context

Status: `VERIFIED` (products catalog API) · `DRAFT` (UI listing, search)

## Identity and evidence

| Field             | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Module            | `products`                                                               |
| Business owner    | Harness maintainers                                                      |
| Source references | `https://automationexercise.com/api_list` (API 1, API 3); live responses |
| Last verified     | 2026-08-13                                                               |

## Business intent

Shoppers must be able to browse the product catalog. If the catalog API is down or returns an empty
or malformed list, the storefront has nothing to sell — this is the first thing a smoke check should
confirm on any environment.

## Actors, permissions, and preconditions

| Actor or role | Allowed behavior             | Preconditions | Denied behavior |
| ------------- | ---------------------------- | ------------- | --------------- |
| Anonymous     | Read product & brand catalog | None (public) | Any mutation    |

## States and transitions

| Starting state | Action                  | Expected state      | Observable evidence                                  |
| -------------- | ----------------------- | ------------------- | ---------------------------------------------------- |
| Catalog online | `GET /api/productsList` | Catalog returned    | HTTP `200`; body `products[]` non-empty; items typed |
| Catalog online | `GET /api/brandsList`   | Brand list returned | HTTP `200`; body `brands[]` non-empty                |

## Technical contract

- Routes: UI listing at `/products` (verified `200`; not yet coded — UI slice).
- API requests and responses (verified live 2026-08-13):
  - `GET https://automationexercise.com/api/productsList`
    → `200`, `{ "responseCode": 200, "products": [ { "id", "name", "price", "brand", "category" } ] }`
  - `GET https://automationexercise.com/api/brandsList`
    → `200`, `{ "responseCode": 200, "brands": [ { "id", "brand" } ] }`
  - Quirk: the transport status is `200` and the payload also carries its own `responseCode` field.
- Stable selectors: none verified yet (site uses `.features_items`, `.productinfo` — UI slice will verify).
- Loading and error states: not applicable to the direct API smoke.
- External dependencies: the public Automation Exercise API.

## Test-data lifecycle

- Synthetic data shape: none — reads only.
- Creation mechanism: none.
- Isolation key: none required (read-only).
- Failure-safe cleanup: none required (no state created).
- Forbidden data: no credentials, PII, or payment data.

## Risks and candidate scenarios

| Risk                         | Candidate behavior                     | Suggested Type | Suggested Priority | Evidence             |
| ---------------------------- | -------------------------------------- | -------------- | ------------------ | -------------------- |
| Catalog API down/empty       | Products list returns 200 with items   | SMOKE          | P0                 | `AE-PRODUCTS-001`    |
| Brand facet broken           | Brand list returns 200 with items      | SMOKE          | P1                 | Candidate (draft)    |
| Product listing UI regressed | `/products` grid renders product cards | REGRESSION     | P1                 | Candidate (UI slice) |

## Unknowns

| Question                     | Owner   | Blocking?           | Resolution           |
| ---------------------------- | ------- | ------------------- | -------------------- |
| Stable UI selector attribute | Harness | Blocks UI specs     | Resolve in UI slice  |
| Synthetic account lifecycle  | Harness | Blocks mutating E2E | Resolve in E2E slice |

## Approval

- [x] Business behavior matches the authoritative source.
- [x] Routes, APIs, selectors, and expected outcomes are verified (API scope).
- [x] Data creation and cleanup are safe (read-only).
- [x] Unknowns that affect assertions or safety are resolved (for the smoke scope).
