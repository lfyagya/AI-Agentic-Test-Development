#!/usr/bin/env node
// Focused coverage for cross-file and cross-branch requirement consistency.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findDivergentRequirements,
  findUnknownSpecRequirementIds,
  loadBaseRequirements,
  validateLocalRequirements,
} from "../check-requirement-consistency.mjs";

const requirement = (overrides = {}) => ({
  id: "AE-PRODUCTS-001",
  module: "products",
  title: "catalog API returns products",
  expectedOutcome: "products returned",
  acceptanceCriteria: ["HTTP 200"],
  preconditions: ["API reachable"],
  status: "active",
  ...overrides,
});

const original = requirement();
assert.deepEqual(
  findDivergentRequirements([original], [{ ...original }]),
  [],
  "an unchanged requirement id must be allowed",
);
assert.deepEqual(
  findDivergentRequirements(
    [requirement({ title: "UI grid renders" })],
    [original],
  ),
  ["AE-PRODUCTS-001"],
  "reusing an id for different behavior must be rejected",
);

assert.throws(
  () => validateLocalRequirements([original, { ...original }]),
  /duplicate or missing id/,
  "duplicate ids in one registry must be rejected",
);
assert.deepEqual(
  [...validateLocalRequirements([original])],
  ["AE-PRODUCTS-001"],
  "active ids must be returned for spec validation",
);

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "requirement-consistency-"),
);
try {
  assert.equal(
    loadBaseRequirements("origin/missing", temporaryRoot),
    null,
    "an unavailable base ref must return null for the offline-safe path",
  );

  const specDirectory = path.join(
    temporaryRoot,
    "cypress",
    "tests",
    "products",
    "smoke",
  );
  fs.mkdirSync(specDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(specDirectory, "products.cy.js"),
    'it("[AE-PRODUCTS-002] grid renders", { tags: ["@AE-PRODUCTS-002", "@smoke", "@P0"] }, () => {});\n',
  );
  assert.deepEqual(
    findUnknownSpecRequirementIds(temporaryRoot, new Set(["AE-PRODUCTS-001"])),
    ["AE-PRODUCTS-002"],
    "a spec id that is not active in the registry must be rejected",
  );
  assert.deepEqual(
    findUnknownSpecRequirementIds(temporaryRoot, new Set(["AE-PRODUCTS-002"])),
    [],
    "a spec id active in the registry must be allowed",
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(
  "[requirements:test] base divergence, duplicates, active ids, and offline behavior verified",
);
