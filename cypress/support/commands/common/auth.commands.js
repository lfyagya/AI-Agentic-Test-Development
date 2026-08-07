/**
 * Replace this fail-fast command with the authentication flow discovered for
 * the target application. Never place credentials in source.
 */
Cypress.Commands.add("ensureAuthenticated", () => {
  throw new Error(
    "cy.ensureAuthenticated() is not configured. Complete project discovery before generating authenticated tests.",
  );
});
