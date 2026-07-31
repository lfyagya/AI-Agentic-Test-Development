# Support Commands Authoring Guide

> **This is a reference doc.** It defines the exact pattern for writing Cypress commands in this framework — naming, structure, ownership, and anti-patterns. Follow it every time you write a new command.

---

## Quick Reference

| Command type        | Naming pattern              | Example                    |
| ------------------- | --------------------------- | -------------------------- |
| Register intercepts | `intercept[Module]Requests` | `interceptPaymentRequests` |
| Navigate to a page  | `visit[Module]`             | `visitPayments`            |
| Load a list         | `load[Module]List`          | `loadPaymentList`          |
| Search or filter    | `search[Module]`            | `searchPayments`           |
| Create a record     | `create[Module]`            | `createPayment`            |
| Assert page loaded  | `assert[Module]Loaded`      | `assertPaymentsLoaded`     |
| Assert a state      | `assert[Module][State]`     | `assertPaymentEmpty`       |

All commands are **verb-first**, camelCase, registered globally via `Cypress.Commands.add`.

---

## Command File Structure

Every command file follows this exact structure:

```javascript
import { MODULE_API } from "@configs/api/modules/[name]/[name].api";
import { MODULE_UI } from "@configs/ui/modules/[name]/[name].ui";
import { ROUTES } from "@configs/app/routes";

// ─── Intercepts ───────────────────────────────────────────────────────────────

Cypress.Commands.add("interceptModuleRequests", () => {
  // register all intercepts for this module
});

// ─── Navigation ───────────────────────────────────────────────────────────────

Cypress.Commands.add("visitModule", () => {
  // intercept + visit + wait
});

// ─── Actions ──────────────────────────────────────────────────────────────────

// interaction commands here

// ─── Assertions ───────────────────────────────────────────────────────────────

// assert* commands here
```

Sections keep large command files scannable. Use the divider comments exactly as shown.

---

## Step-by-Step: Writing a Command File

### Step 1 — Import configs

Always import from the config files. Never hardcode selectors, URLs, or endpoint patterns inside a command.

```javascript
import { PAYMENTS_API } from "@configs/api/modules/payments/payments.api";
import { PAYMENTS_UI } from "@configs/ui/modules/payments/payments.ui";
import { ROUTES } from "@configs/app/routes";
```

### Step 2 — Write the intercept command

This is always the first command. It registers all API intercepts the module needs. Other commands call it internally — specs never call it directly.

```javascript
Cypress.Commands.add("interceptPaymentRequests", () => {
  cy.apiIntercept(PAYMENTS_API, "LIST");
  cy.apiIntercept(PAYMENTS_API, "DETAILS");
});
```

### Step 3 — Write the visit command

The visit command calls the intercept command, navigates, and waits for the primary data load to complete. The spec is done in one call.

```javascript
Cypress.Commands.add("visitPayments", () => {
  cy.interceptPaymentRequests();
  cy.visit(ROUTES.PAYMENTS.ROOT);
  cy.apiWait("@paymentsList");
});
```

### Step 4 — Write interaction commands

Each interaction command does one thing. If an action triggers a network request, register the intercept inside the command and wait for it before returning.

```javascript
Cypress.Commands.add("searchPayments", (query) => {
  cy.apiIntercept(PAYMENTS_API, "SEARCH");
  cy.getByTestId("payments-search-input").clear().type(query);
  cy.getByTestId("payments-search-btn").click();
  cy.apiWait("@paymentsSearch");
});

Cypress.Commands.add("openPaymentDetail", (id) => {
  cy.apiIntercept(PAYMENTS_API, "DETAILS");
  cy.getByTestId(`payment-row-${id}`).click();
  cy.apiWait("@paymentsDetails");
});
```

### Step 5 — Write assertion commands

Assertion commands verify UI state. They use `.should()` chains, never `cy.wait(number)`.

```javascript
Cypress.Commands.add("assertPaymentsLoaded", () => {
  cy.getByTestId("payments-table").should("be.visible");
  cy.getByTestId("payments-loading-spinner").should("not.exist");
});

Cypress.Commands.add("assertPaymentsEmpty", () => {
  cy.getByTestId("payments-empty-state").should("be.visible");
  cy.getByTestId("payments-table").should("not.exist");
});
```

### Step 6 — Register in commands.js

Add one import line to `cypress/support/commands.js`:

```javascript
import "./commands/modules/payments.commands";
```

Keep the imports alphabetical by module name.

---

## Ownership Rule

One command name has exactly one owner file. Before adding a command, verify the name is not already registered:

```bash
grep -r "Cypress.Commands.add" cypress/support/commands/ | grep "commandName"
```

If it exists — extend it, do not duplicate it. If it does not exist — add it to the correct file (common or module-level).

| Command scope            | File location                                               |
| ------------------------ | ----------------------------------------------------------- |
| Used by one module only  | `commands/modules/[name].commands.js`                       |
| Used by multiple modules | `commands/common/ui.commands.js` or appropriate common file |
| Auth, session            | `commands/common/auth.commands.js`                          |
| Navigation helpers       | `commands/common/navigation.commands.js`                    |
| Table interactions       | `commands/common/table.commands.js`                         |

---

## What NOT to Put in a Command

| Anti-pattern                          | Why                                                           | Fix                                                |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `cy.wait(3000)`                       | Timing-dependent, fails on slow machines                      | Replace with `cy.apiWait('@alias')` or `.should()` |
| Hardcoded URL strings                 | Breaks silently when routes change                            | Import from `ROUTES` constants                     |
| Raw CSS selectors like `.btn-primary` | Breaks when styles are refactored                             | Use `[data-cy]` via `cy.getByTestId()`             |
| `if/else` logic                       | Commands are actions, not decision trees                      | Split into two separate commands                   |
| Test assertions in action commands    | Mixes concerns — actions and assertions have different owners | Move to a dedicated `assert*` command              |
| Duplicate intercept patterns          | Second intercept silently overrides the first                 | Centralise in one `intercept*` command             |

---

## The Dual Ownership Anti-Pattern

The most common mistake is letting specs own interaction details that belong in commands.

```javascript
// Wrong — spec controls navigation, selectors, and timing directly
it("searches payments", () => {
  cy.visit("/payments");
  cy.get(".search-input").type("test");
  cy.get(".search-btn").click();
  cy.wait(2000);
  cy.get(".results-table").should("be.visible");
});

// Correct — spec calls commands, commands own the details
it("searches payments", () => {
  cy.visitPayments();
  cy.searchPayments("test");
  cy.assertPaymentsLoaded();
});
```

The correct version is shorter, readable, and resilient to UI changes. The wrong version breaks every time a class name or URL changes.

---

## Available Shared Commands

These are already registered and available in all specs and commands:

| Command                             | What it does                                      |
| ----------------------------------- | ------------------------------------------------- |
| `cy.ensureAuthenticated()`          | Session-cached login — call in `beforeEach()`     |
| `cy.logout()`                       | Clears session and navigates to login             |
| `cy.getByTestId(id)`                | Shorthand for `cy.get('[data-cy="id"]')`          |
| `cy.getByDataTest(id)`              | Shorthand for `cy.get('[data-test="id"]')`        |
| `cy.step(message)`                  | Logs a labelled step to the Cypress command log   |
| `cy.apiIntercept(config, key)`      | Registers one API intercept by key                |
| `cy.apiInterceptAll(config)`        | Registers all intercepts in an API config at once |
| `cy.apiWait(alias)`                 | Waits for a registered intercept                  |
| `cy.apiWaitAll(aliases)`            | Waits for multiple intercepts simultaneously      |
| `cy.apiStub(config, key, response)` | Returns a mocked response                         |
| `cy.validateSchema(body, schema)`   | Validates response body against a JSON schema     |
