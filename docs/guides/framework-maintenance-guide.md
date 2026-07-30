# Framework Maintenance Guide

> **This is a how-to doc.** It gives you exact steps for common maintenance tasks — adding modules, updating endpoints, changing selectors, upgrading dependencies. Follow the steps in order.

---

## Before You Start Any Task

Search `cypress/configs/` and `cypress/support/commands/` first — before creating any new file. If something similar already exists, extend it instead. (The duplication-guard prompt hook will remind you of this automatically.)

---

## How to Add a New Module

A module is one feature area of your application — payments, invoices, users, reports. Each module gets exactly six artifacts.

### Step 1 — Create the API Config

Create `cypress/configs/api/modules/[name]/[name].api.js`:

```javascript
import { HTTP_STATUS } from "@core/api/status-codes.js";

export const PAYMENTS_API = Object.freeze({
  LIST: Object.freeze({
    method: "GET",
    endpoint: "**/api/payments**",
    alias: "paymentsList",
    expectedStatus: HTTP_STATUS.OK,
  }),
  DETAILS: Object.freeze({
    method: "GET",
    endpoint: "**/api/payments/**",
    alias: "paymentsDetails",
    expectedStatus: HTTP_STATUS.OK,
  }),
  CREATE: Object.freeze({
    method: "POST",
    endpoint: "**/api/payments**",
    alias: "paymentsCreate",
    expectedStatus: HTTP_STATUS.CREATED,
  }),
});
```

Every entry needs: `method`, `endpoint` (glob pattern), `alias` (unique camelCase), `expectedStatus`.

### Step 2 — Create the UI Config

Create `cypress/configs/ui/modules/[name]/[name].ui.js`:

```javascript
export const PAYMENTS_UI = Object.freeze({
  LIST: Object.freeze({
    TABLE: '[data-cy="payments-table"]',
    SEARCH_INPUT: '[data-cy="payments-search-input"]',
    EMPTY_STATE: '[data-cy="payments-empty-state"]',
  }),
  FORM: Object.freeze({
    AMOUNT_INPUT: '[data-cy="payments-form-amount"]',
    SUBMIT_BTN: '[data-cy="payments-form-submit"]',
  }),
});
```

> All selectors must use `[data-cy="..."]`. If the app does not have `data-cy` attributes, coordinate with the development team to add them before writing tests.

### Step 3 — Add Routes

Add to `cypress/configs/app/routes.js`:

```javascript
const PAYMENTS = Object.freeze({
  ROOT: "/payments",
  DETAIL: (id) => `/payments/${id}`,
});

export const ROUTES = Object.freeze({
  // existing routes...
  PAYMENTS,
});
```

### Step 4 — Create Commands

Create `cypress/support/commands/modules/[name].commands.js`.

See [support-commands-instructions.md](../guides/support-commands-instructions.md) for the exact step-by-step pattern. Every command file follows the same structure: intercept command first, visit command second, interaction commands third, assertion commands last.

### Step 5 — Register the Command File

In `cypress/support/commands.js`, add one line:

```javascript
import "./commands/modules/payments.commands";
```

One import per module. Keep them alphabetical.

### Step 6 — Write the Smoke Spec

Create `cypress/tests/[name]/smoke/[name]-smoke.cy.js`:

```javascript
describe("Payments — Smoke", { tags: ["@payments", "@smoke"] }, () => {
  beforeEach(() => {
    cy.ensureAuthenticated();
  });

  it("loads the payments list", () => {
    cy.visitPayments();
    cy.assertPaymentsLoaded();
  });
});
```

Smoke tests cover one thing: does the page load and render its primary content? Keep them fast.

### Optional — Add Schema and Fixture Files

Create `cypress/schemas/[name].schema.js` for JSON schema validation of API responses.

Create `cypress/fixtures/[name].json` for static test data objects.

---

## How to Add a New API Endpoint to an Existing Module

Open the existing API config file for that module and add a new frozen entry:

```javascript
export const PAYMENTS_API = Object.freeze({
  // existing entries...
  VOID: Object.freeze({
    method: "POST",
    endpoint: "**/api/payments/**/void**",
    alias: "paymentsVoid",
    expectedStatus: HTTP_STATUS.OK,
  }),
});
```

Then add a command in the module's command file that uses the new alias:

```javascript
Cypress.Commands.add("voidPayment", (id) => {
  cy.apiIntercept(PAYMENTS_API, "VOID");
  cy.getByTestId("payment-void-btn").click();
  cy.apiWait("@paymentsVoid");
});
```

---

## How to Change a Selector

1. Open the UI config file for that module
2. Update the `[data-cy]` constant value
3. Run `npm run cy:run:smoke` to verify nothing regressed

The change propagates automatically to every command that imports the constant. You do not need to touch any command or spec file.

> Never update a selector in a command or spec directly. Always update the config constant.

---

## How to Add a New Common Command

Common commands live in `cypress/support/commands/common/` and are available to all modules.

Before adding one, search **by what the command does**, not just by scanning one folder's command
registrations — the same behavior may already exist under `modules/` instead of `common/`, or under
a name that doesn't obviously match:

```bash
# List every registered command name first
grep -rn "Cypress.Commands.add" cypress/support/commands/

# Then search by the actual selector/endpoint/action it would use —
# a match here means reuse it, even if the command name doesn't suggest it
grep -rn "<the-data-cy-value-or-endpoint-you-need>" cypress/support/commands/ cypress/configs/
```

If nothing matches either search, create or extend the appropriate file:

| What it does                 | File                     |
| ---------------------------- | ------------------------ |
| Auth, login, logout, session | `auth.commands.js`       |
| Navigation, routing          | `navigation.commands.js` |
| Tables, pagination, sorting  | `table.commands.js`      |
| Generic UI interactions      | `ui.commands.js`         |

Register any new common command file in `cypress/support/commands.js` if it is a new file.

---

## How to Upgrade Cypress

Check for outdated packages:

```bash
npm outdated
```

Upgrade to the latest minor version:

```bash
npm install cypress@latest --save-dev
```

Verify tests still pass:

```bash
npm run cy:run:smoke
```

For **major version upgrades**, check the Cypress migration guide for breaking changes in `cypress.config.js` and the support file API before upgrading.

---

## How to Debug a CI Failure Locally

1. Check video artifacts in `cypress/videos/` for visual playback of the failure
2. Check JUnit XML in `reports/junit/` for structured failure data
3. Run the specific failing spec in isolation:

```bash
npx cypress run --spec "cypress/tests/payments/smoke/payments-smoke.cy.js"
```

1. Isolate one failing test by name:

```bash
npx cypress run --expose grepTags=@smoke,grep="loads the payments list"
```

1. Use the `cypress-bug-hunter` agent for a guided root-cause trace.

---

## How to Add a New Environment

1. Create `cypress/config/cypress.env.[name].json` with the environment-specific values
2. Run tests against it:

```bash
npm run cy:run -- --env configFile=[name]
```

---

## Checklist for Every New Module

```text
[ ] Searched existing configs/commands — no existing match found
[ ] API config created with Object.freeze() at every level
[ ] UI config created with [data-cy] selectors only
[ ] Routes added to routes.js
[ ] Commands created following support-commands-instructions.md pattern
[ ] Command file registered in commands.js
[ ] Smoke spec created with cy.ensureAuthenticated() in beforeEach()
[ ] All tests pass locally: npm run cy:run:smoke
[ ] pre-merge-qa-gate agent returns PASS
```
