import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractToolChange,
  scanContent,
} from "../../.claude/hooks/shared-rules.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

assert.deepEqual(
  extractToolChange(
    {
      toolName: "Write",
      toolArgs: {
        path: "cypress/support/demo.js",
        text: "const ok = true;",
      },
    },
    root,
  ),
  { filePath: "cypress/support/demo.js", content: "const ok = true;" },
);

const violations = scanContent(
  "cypress/tests/cart/smoke/cart.cy.js",
  "const password = 'secret-value'; cy.wait(1);",
  { selectors: new Set(), routes: new Set(), endpoints: new Set() },
  root,
);

assert.deepEqual(
  violations.map(({ message }) => message),
  [
    "Hard wait detected. Replace with cy.apiWait(...) or a deterministic state-based wait.",
    "Missing cy.ensureAuthenticated() in auth-required test file.",
    "Hardcoded credential. Read it with cy.env([...]) instead.",
  ],
);

assert.deepEqual(
  scanContent(
    "cypress/support/actions/login.actions.js",
    "export class LoginActions {}",
    { selectors: new Set(), routes: new Set(), endpoints: new Set() },
    root,
  ).map(({ message }) => message),
  [
    "Action class or page-object import. Command-first architecture forbids these dependencies.",
  ],
);
