Cypress.Commands.add("step", (message) => {
  cy.log(`**${message}**`);
});

Cypress.Commands.add("getByTestId", (testId, ...args) => {
  return cy.get(`[data-cy="${testId}"]`, ...args);
});

Cypress.Commands.add("ensureVisible", { prevSubject: true }, (subject) => {
  return cy.wrap(subject).should("be.visible");
});
