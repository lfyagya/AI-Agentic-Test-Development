import "@testing-library/cypress/add-commands";
import "cypress-real-events/support";
import "cypress-wait-until";
import { register as registerCypressGrep } from "@cypress/grep";

import "./commands.js";

registerCypressGrep();

beforeEach(() => {
  cy.clearCookies();
  cy.clearLocalStorage();
});
