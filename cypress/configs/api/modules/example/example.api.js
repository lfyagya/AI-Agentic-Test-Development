/**
 * @fileoverview Example module API config — the reference shape for Layer 1 (API).
 *
 * This is the template every module's API config copies. Step 1 of "Add a Module"
 * points here. Copy this file to `configs/api/modules/[module]/[module].api.js`,
 * rename the export, and replace the entries.
 *
 * Why this module and not `saucedemo/`: saucedemo.com is a client-side-only demo
 * app with no backend calls to intercept. There is nothing honest to demonstrate
 * against it, so the API layer gets its own reference module instead.
 *
 * Every entry is exactly four keys:
 *   method          HTTP verb — must match the real request
 *   endpoint        glob pattern (`**` matches any prefix/suffix) — Cypress route matcher
 *   alias           unique across the whole project; `cy.apiWait()` waits on `@alias`
 *   expectedStatus  asserted by cy.apiWait() unless you pass { assertStatus: false }
 *
 * Usage — register BEFORE cy.visit(), then wait:
 *
 *   import { EXAMPLE_API } from "@configs/api/modules/example/example.api.js";
 *
 *   cy.apiIntercept(EXAMPLE_API.LIST);        // one entry
 *   cy.apiInterceptAll(EXAMPLE_API);          // every entry in the config
 *   cy.visit(ROUTES.EXAMPLE.ROOT);
 *   cy.apiWait(EXAMPLE_API.LIST);             // waits + asserts 200
 *
 * Stub instead of hitting the network:
 *   cy.apiStub(EXAMPLE_API.LIST, { body: { items: [] } });
 *
 * Call it directly, no browser:
 *   cy.apiRequest(EXAMPLE_API.CREATE, { name: "test" });
 */

import { HTTP_STATUS } from "@core/api/status-codes.js";

export const EXAMPLE_API = Object.freeze({
  LIST: Object.freeze({
    method: "GET",
    endpoint: "**/api/v1/examples**",
    alias: "exampleList",
    expectedStatus: HTTP_STATUS.OK,
  }),

  DETAIL: Object.freeze({
    method: "GET",
    endpoint: "**/api/v1/examples/*",
    alias: "exampleDetail",
    expectedStatus: HTTP_STATUS.OK,
  }),

  CREATE: Object.freeze({
    method: "POST",
    endpoint: "**/api/v1/examples",
    alias: "exampleCreate",
    expectedStatus: HTTP_STATUS.CREATED,
  }),

  UPDATE: Object.freeze({
    method: "PUT",
    endpoint: "**/api/v1/examples/*",
    alias: "exampleUpdate",
    expectedStatus: HTTP_STATUS.OK,
  }),

  DELETE: Object.freeze({
    method: "DELETE",
    endpoint: "**/api/v1/examples/*",
    alias: "exampleDelete",
    expectedStatus: HTTP_STATUS.NO_CONTENT,
  }),
});
