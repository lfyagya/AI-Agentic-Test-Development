/**
 * Validate response data with an application-provided schema validator.
 */
Cypress.Commands.add("validateSchema", (data, validator) => {
  if (typeof validator !== "function") {
    throw new Error("validateSchema requires a validator function.");
  }
  return cy.wrap(null).then(() => validator(data));
});
