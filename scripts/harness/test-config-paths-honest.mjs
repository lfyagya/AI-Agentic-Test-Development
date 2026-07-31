#!/usr/bin/env node
// The paths declared in harness.config.json must match what the engine actually enforces.
//
// The engine hardcodes the framework directory — shared-rules.mjs, the hooks, and evidence.mjs all
// contain a literal `cypress/`. That is a defensible choice: this repo is single-framework, and
// deriving the rule regexes from config at runtime would add a silent-failure mode where a config
// typo stops every rule matching while everything still reports green.
//
// What is NOT defensible is declaring a path in config that nothing reads. `project.testRoot` was
// exactly that: change it, watch the generated docs update, and watch every rule keep matching the
// old directory. Config that looks authoritative but is inert invites a change that silently does
// nothing — the same failure mode as a rule declared `block` with no pattern behind it.
//
// So this test asserts the two agree. If someone changes a declared path, this fails and tells them
// the engine hardcodes it, rather than letting them believe the change took effect.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENSION_PATTERNS } from "../../.claude/hooks/shared-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "harness.config.json"), "utf8"));
const { framework, project } = config;

// 1. The declared testRoot must be the directory the engine actually scans.
const probe = `${project.testRoot}/tests/demo/smoke/demo.cy.js`;
assert.ok(
  EXTENSION_PATTERNS.TARGET_FILE_RE.test(probe),
  `project.testRoot is "${project.testRoot}" but the engine's TARGET_FILE_RE does not match ` +
    `"${probe}". The engine hardcodes its directory, so changing project.testRoot alone has no ` +
    `effect — update .claude/hooks/shared-rules.mjs too, or revert the declaration.`,
);
const outside = "somewhere-else/tests/demo/smoke/demo.cy.js";
assert.ok(
  !EXTENSION_PATTERNS.TARGET_FILE_RE.test(outside),
  "the engine matches a path outside the declared testRoot — the scope is wider than declared",
);

// 2. The declared spec glob's extension set must be what the engine treats as a spec.
//    cypress/tests/**/*.cy.{js,ts} implies both .cy.js and .cy.ts are specs.
const globExts = (project.specGlob.match(/\{([^}]+)\}/)?.[1] ?? project.specGlob.split(".").pop())
  .split(",")
  .map((e) => e.trim());
for (const ext of globExts) {
  assert.ok(
    EXTENSION_PATTERNS.SPEC_RE.test(`demo.cy.${ext}`),
    `project.specGlob declares .cy.${ext} as a spec but the engine's SPEC_RE does not match it`,
  );
}

// 3. The declared roots must exist on disk, or the glob points at nothing.
for (const key of ["testRoot", "configRoot", "commandRoot"]) {
  assert.ok(
    fs.existsSync(path.join(root, project[key])),
    `project.${key} is "${project[key]}" but that directory does not exist`,
  );
}

// 4. The spec-glob root must be the directory the runner discovers specs in.
const globRoot = project.specGlob.split("/**")[0];
assert.ok(
  fs.existsSync(path.join(root, globRoot)),
  `project.specGlob points at "${globRoot}" which does not exist — the empty state needs it ` +
    `present (a .gitkeep is enough) or a fresh clone has nowhere to put its first spec`,
);

console.log(
  `[config-paths] ${framework}: declared paths agree with the engine; all roots exist on disk`,
);
