#!/usr/bin/env node
// Focused coverage for the one-requirement-tag block rule.
//
// This rule exists because two real PRs shipped tag defects that a green `npm run verify` never
// caught: a spec carrying both @SMOKE and @smoke (two Type tags), and specs whose tags were never
// validated at all. The rule is structural and single-file; requirement *activeness* and
// cross-branch uniqueness are graded by evidence:build and check:requirements.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanContent } from "../../.claude/hooks/shared-rules.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const allowlist = {
  selectors: new Set(),
  routes: new Set(),
  endpoints: new Set(),
};
// Path contains "public" so require-auth stays silent and each case isolates the tag rule.
const SPEC = "cypress/tests/products/smoke/public-products.cy.js";

const tagMessages = (content) =>
  scanContent(SPEC, content, allowlist, root)
    .map((v) => v.message)
    .filter((m) =>
      m.startsWith("Spec must carry exactly one known requirement id"),
    );

// A fully compliant test produces no tag violation.
assert.equal(
  tagMessages(
    'it("[AE-PRODUCTS-001] catalog renders", { tags: ["@AE-PRODUCTS-001", "@smoke", "@P0"] }, () => {});',
  ).length,
  0,
  "a correctly tagged test must not trip the rule",
);

// Nested options before `tags` remain visible to the balanced-object parser.
assert.equal(
  tagMessages(
    'it("[AE-PRODUCTS-001] catalog renders", { retries: { runMode: 1 }, env: { locale: "en" }, tags: ["@AE-PRODUCTS-001", "@smoke", "@P0"] }, () => {});',
  ).length,
  0,
  "nested options before tags must not create a false positive",
);

// The exact PR #5 defect: duplicate Type tag (@SMOKE + @smoke) is two Type tags.
const duplicateType = tagMessages(
  'it("[AE-PRODUCTS-001] catalog", { tags: ["@AE-PRODUCTS-001", "@SMOKE", "@P0", "@smoke"] }, () => {});',
);
assert.equal(duplicateType.length, 1, "duplicate Type tag must be flagged");
assert.match(duplicateType[0], /exactly one Type tag .* found 2/);

// More than one requirement tag is rejected.
assert.match(
  tagMessages(
    'it("[AE-PRODUCTS-001] catalog", { tags: ["@AE-PRODUCTS-001", "@AE-PRODUCTS-002", "@smoke", "@P0"] }, () => {});',
  )[0],
  /exactly one requirement id tag, found 2/,
);

// No tags at all.
assert.equal(
  tagMessages('it("[AE-PRODUCTS-001] catalog", () => {});').length,
  1,
  "a test with no tags must be flagged",
);

// No requirement id in the title.
assert.match(
  tagMessages(
    'it("catalog renders", { tags: ["@AE-PRODUCTS-001", "@smoke", "@P0"] }, () => {});',
  )[0],
  /title must begin with a \[REQUIREMENT-ID\] prefix/,
);

// Title id and requirement tag disagree.
assert.match(
  tagMessages(
    'it("[AE-PRODUCTS-002] catalog", { tags: ["@AE-PRODUCTS-001", "@smoke", "@P0"] }, () => {});',
  )[0],
  /does not match requirement tag/,
);

// Missing Priority tag.
assert.match(
  tagMessages(
    'it("[AE-PRODUCTS-001] catalog", { tags: ["@AE-PRODUCTS-001", "@smoke"] }, () => {});',
  )[0],
  /exactly one Priority tag .* found 0/,
);

// Modifiers and specify() use the same contract.
assert.equal(
  tagMessages(
    'it.only("[AE-PRODUCTS-001] focused", { tags: ["@AE-PRODUCTS-001", "@smoke", "@P0"] }, () => {});\n' +
      'specify("[AE-PRODUCTS-002] explicit", { tags: ["@AE-PRODUCTS-002", "@smoke", "@P1"] }, () => {});',
  ).length,
  0,
  "it modifiers and specify() must parse correctly",
);

// Tier tags are path-aware: @smoke satisfies both Type and tier on this smoke path.
assert.match(
  tagMessages(
    'it("[AE-PRODUCTS-001] wrong tier", { tags: ["@AE-PRODUCTS-001", "@regression", "@P0", "@e2e"] }, () => {});',
  )[0],
  /tier tag \(@smoke\).*found 0/,
);

// A spec file with no test cases produces no tag violations (helper/describe-only files).
assert.equal(
  tagMessages('describe("group", () => {});').length,
  0,
  "a file with no it()/specify() must not be flagged",
);

console.log("[tag-rule] one-requirement-tag structural checks verified");
