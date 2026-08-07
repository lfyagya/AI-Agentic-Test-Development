Cypress.Commands.add("navigateTo", (path) => {
  if (typeof path !== "string" || !path.trim()) {
    throw new Error("navigateTo requires a non-empty path.");
  }
  cy.visit(path);
});

Cypress.Commands.add("assertCurrentPath", (path) => {
  cy.location("pathname").should("eq", path);
});
