import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildEvidence } from "./evidence.mjs";

const requirement = {
  id: "PAY-CHECKOUT-001",
  module: "checkout",
  title: "creates order when cart is valid",
  acceptanceCriteria: ["Order is persisted"],
  preconditions: ["Synthetic cart exists"],
  expectedOutcome: "Confirmation is visible",
  type: "SMOKE",
  priority: "P0",
  tier: "smoke",
  path: "positive",
  status: "active",
  source: "REQ-1",
};

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-evidence-"));
  fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "evidence", "requirements.json"),
    `${JSON.stringify({ version: 1, requirements: [requirement] }, null, 2)}\n`,
  );
  return root;
}

const roots = [];
try {
  const cypressRoot = fixtureRoot();
  roots.push(cypressRoot);
  const cypressReport = path.join(cypressRoot, "report.json");
  fs.writeFileSync(
    cypressReport,
    JSON.stringify({
      stats: { start: "2026-01-01T00:00:00.000Z", duration: 100 },
      results: [
        {
          file: "cypress/tests/checkout/smoke/checkout-smoke.cy.js",
          tests: [
            {
              title: "[PAY-CHECKOUT-001] creates order when cart is valid",
              duration: 100,
              pass: true,
            },
          ],
        },
      ],
    }),
  );
  const cypress = buildEvidence({
    root: cypressRoot,
    framework: "cypress",
    reportPath: cypressReport,
    runId: "cypress-run",
    now: "2026-01-01T00:00:00.000Z",
  });
  assert.deepEqual(cypress.summary.totals, {
    passed: 1,
    failed: 0,
    flaky: 0,
    skipped: 0,
  });
  assert.equal(cypress.summary.tests[0].requirement, requirement.id);
  assert.equal(cypress.metrics.metrics.M5.value, 1);

  const playwrightRoot = fixtureRoot();
  roots.push(playwrightRoot);
  const playwrightReport = path.join(playwrightRoot, "report.json");
  fs.writeFileSync(
    playwrightReport,
    JSON.stringify({
      stats: { startTime: "2026-01-01T00:00:00.000Z", duration: 120 },
      suites: [
        {
          specs: [
            {
              title: "[PAY-CHECKOUT-001] creates order when cart is valid",
              file: "checkout/smoke/checkout-smoke.spec.ts",
              tests: [
                {
                  status: "expected",
                  results: [{ status: "passed", duration: 120 }],
                },
              ],
            },
          ],
        },
      ],
    }),
  );
  const playwright = buildEvidence({
    root: playwrightRoot,
    framework: "playwright",
    reportPath: playwrightReport,
    runId: "playwright-run",
    now: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(playwright.summary.totals.passed, 1);
  assert.equal(playwright.summary.tests[0].requirement, requirement.id);
  assert.equal(playwright.metrics.metrics.M5.value, 1);

  const emptyRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "harness-evidence-empty-"),
  );
  roots.push(emptyRoot);
  fs.mkdirSync(path.join(emptyRoot, "evidence"), { recursive: true });
  fs.writeFileSync(
    path.join(emptyRoot, "evidence", "requirements.json"),
    `${JSON.stringify({ version: 1, requirements: [] }, null, 2)}\n`,
  );
  const empty = buildEvidence({
    root: emptyRoot,
    framework: "cypress",
    reportPath: "missing.json",
    runId: "empty-run",
    now: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(empty.summary.executionStatus, "not-run");
  assert.equal(empty.metrics.status, "bootstrap");
  assert.equal(empty.metrics.metrics.M5.value, null);

  const invalidRoot = fixtureRoot();
  roots.push(invalidRoot);
  fs.writeFileSync(
    path.join(invalidRoot, "evidence", "requirements.json"),
    JSON.stringify({
      version: 1,
      requirements: [{ ...requirement, type: "HAPPY_PATH" }],
    }),
  );
  assert.throws(
    () =>
      buildEvidence({
        root: invalidRoot,
        framework: "cypress",
        reportPath: "missing.json",
      }),
    /invalid type/,
  );
} finally {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  "[evidence:test] Cypress, Playwright, and empty-state evidence passed.",
);
