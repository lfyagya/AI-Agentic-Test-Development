#!/usr/bin/env node
// Guards the extension surface of the rule scanner.
//
// This test exists because of a real defect: every rule pattern was hardcoded to `.js`, so a
// `.cy.ts` spec containing five block-severity violations produced ZERO findings. TypeScript
// appeared to work while silently disabling the entire write-time guardrail — the worst kind of
// failure, because nothing warned anyone. Cypress supports TypeScript natively, so the file was
// executed; only the harness was blind to it.
//
// If someone narrows a pattern back to .js, or adds a rule with a fresh .js-only regex, this fails.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTENSION_PATTERNS,
  scanContent,
} from "../../.claude/hooks/shared-rules.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

// One spec body that trips several block rules at once.
const VIOLATING_SPEC = `
describe("probe", () => {
  it("breaks the rules", () => {
    cy.visit("https://hardcoded.example.com/login");
    cy.get("[data-cy=username]").type("admin");
    const password = "s3cret-literal";
    cy.wait(3000);
    cy.request("POST", "/api/orders", { password });
  });
});
`;

const allowlist = {
  selectors: new Set(["body", "html"]),
  routes: new Set(["/"]),
  endpoints: new Set(),
};

// Every extension Cypress can execute must be scanned identically.
const EXTENSIONS = ["js", "ts", "mjs", "mts", "cjs", "cts"];
const counts = new Map();

for (const ext of EXTENSIONS) {
  const file = `cypress/tests/probe/smoke/probe.cy.${ext}`;
  const violations = scanContent(file, VIOLATING_SPEC, allowlist, repoRoot);
  counts.set(ext, violations.length);
  assert.ok(
    violations.length > 0,
    `.cy.${ext} produced no violations — that extension bypasses every rule`,
  );
}

// Not just "some" findings: the same code must yield the same verdict in every language.
const [baseline, ...rest] = EXTENSIONS.map((e) => counts.get(e));
for (const [index, count] of rest.entries()) {
  assert.equal(
    count,
    baseline,
    `.cy.${EXTENSIONS[index + 1]} found ${count} violations but .cy.js found ${baseline} — ` +
      `enforcement must not depend on the language`,
  );
}

// The specific rules that were silently skipped before the fix.
const messages = scanContent(
  "cypress/tests/probe/smoke/probe.cy.ts",
  VIOLATING_SPEC,
  allowlist,
  repoRoot,
)
  .map((v) => v.message)
  .join(" | ");
for (const expected of [
  "Hard wait",
  "Hardcoded selector",
  "Hardcoded route",
  "credential",
  "Write request",
]) {
  assert.ok(
    messages.includes(expected),
    `TypeScript spec did not trigger: ${expected}`,
  );
}

// The shared constants are the single place extensions are declared. Keep them that way.
for (const [name, pattern] of Object.entries(EXTENSION_PATTERNS)) {
  if (name === "SCRIPT_EXT") continue;
  assert.ok(pattern instanceof RegExp, `${name} should be a RegExp`);
  assert.ok(
    pattern.source.includes("[jt]s"),
    `${name} does not accept TypeScript — it was narrowed back to JavaScript only`,
  );
}

// A non-script file under cypress/ must still be ignored.
assert.equal(
  scanContent("cypress/fixtures/data.json", VIOLATING_SPEC, allowlist, repoRoot)
    .length,
  0,
  "a .json file should not be scanned as a script",
);

console.log(
  `[rules] extension coverage verified for ${EXTENSIONS.join(", ")} (${baseline} violations each)`,
);
