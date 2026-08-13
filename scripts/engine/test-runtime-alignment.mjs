#!/usr/bin/env node
// Supported runtime is Node 22 across package metadata, CI workflows, and Cloud install.
// Drift here is how a clone "works on my machine" and fails in CI (or the reverse).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REQUIRED_MAJOR = 22;

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const engines = pkg.engines?.node;
assert.ok(engines, "package.json must declare engines.node");
assert.match(
  String(engines),
  new RegExp(`>=\\s*${REQUIRED_MAJOR}(\\.0\\.0)?`),
  `package.json engines.node must require Node ${REQUIRED_MAJOR}+ (found ${engines})`,
);

const workflows = [
  path.join(root, ".github", "workflows", "cypress.yml"),
  path.join(root, ".github", "workflows", "cypress-rules.yml"),
];
for (const file of workflows) {
  const text = fs.readFileSync(file, "utf8");
  assert.match(
    text,
    /NODE_VERSION:\s*"22"|node-version:\s*"22"/,
    `${path.relative(root, file)} must pin Node 22`,
  );
  assert.doesNotMatch(
    text,
    /node-version:\s*"(18|20)"|NODE_VERSION:\s*"(18|20)"/,
    `${path.relative(root, file)} still pins a pre-22 Node version`,
  );
}

const environment = JSON.parse(
  fs.readFileSync(path.join(root, ".cursor", "environment.json"), "utf8"),
);
assert.match(
  String(environment.install ?? ""),
  /major\s*<\s*22|Node\.js 22\+/,
  ".cursor/environment.json install must refuse Node < 22",
);

const config = fs.readFileSync(path.join(root, "cypress.config.js"), "utf8");
assert.doesNotMatch(
  config,
  /chromeWebSecurity\s*:\s*false/,
  "cypress.config.js must not disable chromeWebSecurity without a verified requirement",
);

console.log(
  `[runtime-alignment] Node ${REQUIRED_MAJOR}+ declared in package, CI, and Cloud install; chromeWebSecurity default restored`,
);
