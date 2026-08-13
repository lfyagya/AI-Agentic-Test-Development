/**
 * @fileoverview Products API and listing UI commands.
 *
 * cy.requestProductCatalog()             — request the public read-only catalog.
 * cy.visitProducts()                     — open the All Products listing route.
 * cy.assertProductsListingVisible(min)   — assert heading + non-empty visible card grid.
 */
import { PRODUCTS_API } from "@configs/api/modules/products/products.api.js";
import { ROUTES } from "@configs/app/routes.js";
import { PRODUCTS_UI } from "@configs/ui/modules/products/products.ui.js";

Cypress.Commands.add("requestProductCatalog", () => {
  return cy.apiRequest(PRODUCTS_API.LIST);
});

Cypress.Commands.add("visitProducts", () => {
  cy.navigateTo(ROUTES.PRODUCTS);
  cy.assertCurrentPath(ROUTES.PRODUCTS);
});

Cypress.Commands.add("assertProductsListingVisible", (minCount = 1) => {
  cy.contains("h2", PRODUCTS_UI.headingText).should("be.visible");
  cy.get(PRODUCTS_UI.listingGrid).should("be.visible");
  cy.get(PRODUCTS_UI.productCard).should("have.length.gte", minCount);
  cy.get(PRODUCTS_UI.productName).should(($names) => {
    const hasVisibleName = $names
      .toArray()
      .some(
        (name) =>
          Cypress.dom.isVisible(name) && Boolean(name.textContent?.trim()),
      );
    expect(hasVisibleName, "at least one visible product name").to.be.true;
  });
});
