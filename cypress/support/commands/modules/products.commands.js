/**
 * @fileoverview Products module commands.
 *
 * Behavior only — the spec owns the observable assertions. `requestProductCatalog` issues the
 * read-only catalog request defined in the products API config; it never mutates state, so it is
 * safe for the smoke tier.
 */
import { PRODUCTS_API } from "@configs/api/modules/products/products.api.js";

Cypress.Commands.add("requestProductCatalog", () => {
  return cy.apiRequest(PRODUCTS_API.LIST);
});
