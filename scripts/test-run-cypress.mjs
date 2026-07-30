import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSpecs, run } from "./run-cypress.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cypress-runner-"));
try {
  assert.equal(run("smoke", [], root), 0);
  const smokeDirectory = path.join(root, "cypress", "tests", "orders", "smoke");
  const e2eDirectory = path.join(root, "cypress", "tests", "orders", "e2e");
  fs.mkdirSync(smokeDirectory, { recursive: true });
  fs.mkdirSync(e2eDirectory, { recursive: true });
  fs.writeFileSync(path.join(smokeDirectory, "orders-smoke.cy.js"), "");
  fs.writeFileSync(path.join(e2eDirectory, "orders-e2e.cy.js"), "");
  assert.equal(findSpecs(root, "smoke").length, 1);
  assert.equal(findSpecs(root, "e2e").length, 1);
  assert.equal(findSpecs(root, "all").length, 2);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("[cypress:runner:test] Empty-state and scope discovery passed.");
