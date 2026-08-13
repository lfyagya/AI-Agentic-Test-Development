# Project Context

Status: `DRAFT`

## Ownership and sources

| Field                  | Value                                                                 |
| ---------------------- | --------------------------------------------------------------------- |
| Project                | Automation Exercise (public practice AUT) on cypress-automation-boilerplate harness |
| Accountable owner      | Yagya Bhatta (`yagyabhatta@lftechnology.com`) — pending formal owner confirmation |
| Application repository | Public site only (no first-party app repo in this worktree): `https://www.automationexercise.com/` |
| Requirement source     | Owner-authorized UI listing slice + live public site / published API list page |
| API/schema source      | `https://www.automationexercise.com/api_list` (published practice API descriptions) |
| Last verified          | `2026-08-13`                                                          |
| Harness repository     | `github.com/lfyagya/cypress-automation-boilerplate`                  |
| Profile / adapters     | `harness/profiles/projects/cypress-boilerplate.json` — all adapters remain enabled because the team tool set is not yet owner-confirmed (Cursor confirmed for this cloud-agent run only) |

## Environments and safety

| Environment | Base URL | Data class | Allowed operations | Approval |
| ----------- | -------- | ---------- | ------------------ | -------- |
| Public practice (shared) | `https://www.automationexercise.com` (HTTP 200 verified `2026-08-13`) | Shared public demo data (not owned synthetic fixtures) | Read-only smoke/UI against public pages for the products listing slice | Owner must approve treating this shared public site as the smoke/e2e target |
| Development | `<unknown — no private AUT env provided>` | Synthetic | `<unknown>` | Owner |
| QA | `<unknown — no private AUT env provided>` | Synthetic | `<unknown>` | Owner |
| Production | Same public hostname as above if used as “prod-like” | Shared public demo — no harness-owned test data | Read-only smoke only | Owner |

### BASE_URL (non-secret) — recorded, not wired

- Verified public origin: `https://www.automationexercise.com` (trailing slash optional; HTML routes resolve under this host).
- Owner authorized treating `BASE_URL` as a **non-secret** so smoke/UI and e2e can run in CI without a GitHub Actions secret for the URL.
- Current CI (`.github/workflows/cypress.yml`) still reads `secrets.BASE_URL`. Changing that wiring is **out of GATHER ownership**; record as a follow-up for MAINTAIN / owner before CI execution of AUT tests.
- Appropriate non-secret homes per harness docs: tracked `cypress/environments/cypress.env.*.json` and/or a non-secret CI env var — not a credential store.
- Auth secrets (`CYPRESS_USERNAME` / `CYPRESS_PASSWORD` / etc.) remain unnecessary for the public products listing slice.

## Contracts to verify

- Authentication and roles: Products listing is reachable without login (navbar includes Signup / Login; `/products` returned 200 with product markup for an unauthenticated GET). No role model verified beyond anonymous visitor for this slice.
- Stable selector attribute: **None** — live HTML has no `data-testid` / `data-cy`. Candidate CSS/id hooks observed on `/products` are listed in the products module context for **DISCOVER** to contract into `cypress/configs/ui/**` (not invented into configs during GATHER).
- Supported browsers: `<unknown>` — harness default only; AUT browser matrix not published on the pages inspected.
- API dependencies (optional for UI listing): Published `GET https://automationexercise.com/api/productsList` (also reachable under `www` with a normal browser User-Agent) returns `responseCode: 200` and a `products` array; **not** required for the read-only UI listing requirement.
- Test-data creation and cleanup: Not required for read-only listing smoke. Mutating cart/search/account flows stay out of scope until synthetic/shared-data rules are approved.
- External integrations: YouTube Video Tutorials nav link (third-party); optional Cypress Cloud — must not be baseline-required.
- Accessibility or regulatory obligations: `<unknown>`.
- CI lanes and branch policy: Existing workflow has smoke/e2e jobs; AUT `BASE_URL` non-secret wiring still pending (see above).

## Mutation policy

- Production / public shared smoke: **read-only** (no POST/PUT/PATCH/DELETE from smoke specs).
- Products listing slice authorized for intake: observe `/products` grid only.
- Cart add, search submit, signup/login, and API write examples are **not** approved for active automation in this GATHER pass.

## Modules

| Module | Business owner | Risk | Context status |
| ------ | -------------- | ---- | -------------- |
| `products` | Yagya Bhatta (pending confirmation) | Shared public demo can change catalog contents/order; selectors are class/id based | `DRAFT` — listing slice verified from live site |

## Unknowns and decisions

| Item | Why it matters | Owner | Status |
| ---- | -------------- | ----- | ------ |
| Formal accountable owner / business owner for Automation Exercise automation | Approval of draft → active and mutation boundaries | Yagya Bhatta | Open — email from cloud-agent run used as interim contact |
| AI tools the team will actually use (claude / copilot / cursor / codex) | Adapter projections and write-time hooks | Owner | Open — Cursor confirmed for this run; all four adapters left enabled (silence → everything wired). Note: Claude/Cursor/Copilot can refuse violating writes via shared hook scripts in this repo; Codex gate is `npm run verify` + pre-push |
| Whether CI may hit the public site on every PR | Cost, flake, and courtesy toward a shared practice site | Owner | Open |
| Exact assertion strength for catalog size (e.g. “≥1 card” vs “exactly N”) | N=34 observed on `2026-08-13` for both UI wrappers and API `products.length`, but shared catalogs can change | Owner | Open — draft requirement uses non-empty grid, not a hard count |
| Selector strategy approval (class/id vs role/name) | No test attributes on AUT; locator contract prefers role/name | Owner + DISCOVER | Open — blocks durable config constants |
| Private/staging AUT mirror | Prefer non-shared env for future mutations | Owner | Unknown / absent |
| Rename harness profile from `cypress-boilerplate` to an Automation Exercise key | Identity clarity vs boilerplate reuse | Owner | Open — not changed during GATHER |

## Approval

- [ ] Sources are authoritative.
- [ ] Environment and mutation boundaries are approved.
- [ ] Authentication and test-data handling are approved.
- [ ] At least one module is ready for requirement derivation.
- [ ] Draft requirement(s) may be promoted to `active` for BUILD.
- [ ] `BASE_URL` non-secret CI/environment wiring is approved and implemented outside GATHER.
- [ ] DISCOVER may capture `/products` selectors into `cypress/configs/**`.
