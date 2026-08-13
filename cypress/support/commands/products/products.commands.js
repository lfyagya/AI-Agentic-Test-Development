/**
 * @fileoverview Products listing commands.
 *
 * cy.visitProducts()                     — open the All Products listing route.
 * cy.assertProductsListingVisible(min)   — assert the heading and a non-empty card grid.
 *
 * Selectors and route come from config so a single application change stays a single edit.
 */
import { ROUTES } from "@configs/app/routes.js";
import { PRODUCTS_UI } from "@configs/ui/products/products.ui.js";

Cypress.Commands.add("visitProducts", () => {
  cy.navigateTo(ROUTES.PRODUCTS);
  cy.assertCurrentPath(ROUTES.PRODUCTS);
});

Cypress.Commands.add("assertProductsListingVisible", (minCount = 1) => {
  cy.contains("h2", PRODUCTS_UI.headingText).should("be.visible");
  cy.get(PRODUCTS_UI.listingGrid).should("be.visible");
  cy.get(PRODUCTS_UI.productCard).should("have.length.gte", minCount);
  cy.get(PRODUCTS_UI.productName)
    .first()
    .invoke("text")
    .should("match", /\S/);
});
