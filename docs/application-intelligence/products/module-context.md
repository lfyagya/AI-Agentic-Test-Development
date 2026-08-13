# Module Context

Status: `ACTIVE`

## Identity and evidence

| Field             | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Module            | `products`                                                            |
| Business owner    | Yagya Bhatta — pending formal confirmation                            |
| Source references | Live `GET https://www.automationexercise.com/products` (200, `2026-08-13`); site meta “This is for automation practice”; API list `https://www.automationexercise.com/api_list`; owner-authorized UI listing slice |
| Last verified     | `2026-08-13`                                                          |

## Business intent

Anonymous visitors can open the public Products page and see the shop’s **All Products** listing so they can browse catalog items before viewing details or adding to cart. Failure means the primary catalog surface is unavailable for practice automation and for shoppers.

Authorized GATHER scope: **listing grid visibility only** (route + heading + non-empty product grid). Search, category/brand filters, view-product, and add-to-cart are observed as adjacent surfaces but are **not** approved behaviors for this slice.

## Actors, permissions, and preconditions

| Actor or role | Allowed behavior | Preconditions | Denied behavior |
| ------------- | ---------------- | ------------- | --------------- |
| Anonymous visitor | Open `/products` and see All Products listing grid | Public site reachable; no login | Not verified for this slice (no authz matrix beyond public read) |
| Authenticated user | `<unknown for listing — not required>` | `<n/a for authorized slice>` | `<unknown>` |

## States and transitions

| Starting state | Action | Expected state | Observable evidence |
| -------------- | ------ | -------------- | ------------------- |
| Any public entry (e.g. home `/`) | Follow Products nav or open products route | Products listing shown | Document title `Automation Exercise - All Products`; heading text `All Products`; product cards present under the listing region |
| Products listing | `<out of scope>` View Product | Product detail route pattern `/product_details/{id}` observed in markup | Link text includes `View Product` — not part of authorized listing assertion |
| Products listing | `<out of scope>` Add to cart | Modal copy `Added!` / cart messaging present in page HTML | Mutating; smoke-forbidden until separately approved |

### Listing grid {#listing-grid}

Verified on `2026-08-13` via unauthenticated HTTP GET of the HTML document:

- Route path: `/products` (navbar `href="/products"` labeled Products).
- Page `<title>`: `Automation Exercise - All Products`.
- Visible section heading: `All Products` (`h2` with classes including `title text-center` inside a `features_items` region).
- Listing presentation: **card/grid of products**, not an HTML `<table>` and not `role="grid"`. Owner wording “table/grid” maps to this **product listing grid** only.
- Product cards observed: **34** elements with class `product-image-wrapper` / `productinfo`; each exposes a price in an `h2`, a product name in a `p` (examples: `Blue Top`, `Men Tshirt`, `Sleeveless Dress`), an `Add to cart` control, and a `View Product` link to `/product_details/{id}`.
- Left sidebar also shows `Category` and `Brands` navigation blocks (filter surfaces; out of listing-slice acceptance unless owner expands scope).

## Technical contract

- Routes (verified path strings; **not** yet added to `cypress/configs/app/routes.js` — still `ROUTES = {}`):
  - `/` — Home
  - `/products` — All Products listing (this module)
  - `/product_details/{id}` — detail (linked from cards; out of slice)
  - `/category_products/{id}` — category filter (sidebar; out of slice)
  - `/brand_products/{brand}` — brand filter (sidebar; out of slice)
  - Other navbar paths observed: `/view_cart`, `/login`, `/test_cases`, `/api_list`, `/contact_us`
- API requests and responses (optional corroboration, not UI acceptance):
  - Published: `API 1: Get All Products List` → `GET https://automationexercise.com/api/productsList`
  - Verified `2026-08-13` with browser User-Agent: JSON `{"responseCode":200,"products":[...]}` with **34** products; first item `id: 1`, `name: "Blue Top"`, `price: "Rs. 500"`, `brand: "Polo"`.
  - Note: some non-browser clients receive HTTP 403; UI listing smoke must not depend on API access.
- Stable selectors:
  - **Contracted in repo:** none (`NAVIGATION_UI` empty).
  - **Observed candidates for DISCOVER (not config yet):** listing region `features_items`; card `product-image-wrapper` / `productinfo`; heading text `All Products`; search controls `input#search_product` / `button#submit_search` (search out of slice); cart affordance `add-to-cart` / `data-product-id`.
  - Prefer role/name/visible text per `harness/qa-automation-foundations.md` before freezing CSS.
- Loading and error states: `<unknown>` — not observed in static HTML GET.
- External dependencies: static assets under `/static/...`; product images via `/get_product_picture/{id}`.

## Test-data lifecycle

- Synthetic data shape: none for read-only listing.
- Creation mechanism: n/a (shared public catalog).
- Isolation key: n/a.
- Failure-safe cleanup: n/a for smoke listing.
- Forbidden data: real PII/credentials; do not commit secrets. Do not assert against other users’ accounts.

## Risks and candidate scenarios

| Risk | Candidate behavior | Suggested Type | Suggested Priority | Evidence |
| ---- | ------------------ | -------------- | ------------------ | -------- |
| Catalog page down or empty | Anonymous visitor opens `/products` and sees All Products with a non-empty listing grid | SMOKE | P0 | Live HTML + title/heading/cards verified `2026-08-13` |
| Shared demo catalog churn | Hard-coding product count `34` or exact first-row names | REGRESSION (avoid as P0) | P2 | Count matched UI/API today but is not a published invariant |
| Search UX regression | Submit product search from `#search_product` | REGRESSION | P1 | Controls present; behavior not verified end-to-end in GATHER |
| Selector fragility (no test ids) | DISCOVER contracts durable locators | n/a (enabler) | P0 enabler | No `data-testid` / `data-cy` on page |

## Unknowns

| Question | Owner | Blocking? | Resolution |
| -------- | ----- | --------- | ---------- |
| Approve draft `AE-PRODUCTS-001` → `active`? | Owner | Yes for BUILD | **Resolved `2026-08-13`: promoted to `active`** |
| Assert “≥1 product card” vs exact catalog size/names? | Owner | Yes for assertion strength | **Resolved `2026-08-13`: assert ≥1 card + heading (no hard count)** |
| May DISCOVER write class/id constants for the grid? | Owner | Yes before durable BUILD | **Resolved `2026-08-13`: approved** |
| Is “table” assertion required literally? | Owner | Yes if they insist on `<table>` | Verified: **no table**; grid/cards only — requirement uses listing grid |
| Expand slice to search / view product / add to cart? | Owner | No for listing BUILD | Keep draft-only candidates above |

## Approval

- [x] Business behavior matches the authoritative source.
- [x] Routes, APIs, selectors, and expected outcomes are verified.
- [x] Data creation and cleanup are safe.
- [x] Unknowns that affect assertions or safety are resolved.
