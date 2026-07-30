#!/usr/bin/env node
// Self-check for this repo's profile layer. Run: node harness/profiles/bin/test-compose.mjs
// Discovers every profile in ../projects (skipping _template) so it works in any adapter repo.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compose } from "./compose-harness-config.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILES = path.join(HERE, "..", "projects");
const ADAPTERS = path.join(HERE, "..", "adapters");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const REQUIRED = [
  "version",
  "framework",
  "adapters",
  "project",
  "context",
  "loops",
  "qaFoundations",
  "rules",
  "agents",
  "hooks",
  "permissions",
];
const ROLES = ["GATHER", "DISCOVER", "BUILD", "DIAGNOSE", "EVALUATE", "SHIP", "MAINTAIN"];

const profiles = fs.readdirSync(PROFILES).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
assert.ok(profiles.length > 0, "no profiles found");

const adapters = fs.readdirSync(ADAPTERS).map((f) => f.replace(/\.json$/, ""));
assert.ok(adapters.length > 0, "no adapter baselines found");

for (const file of profiles) {
  const profile = readJson(path.join(PROFILES, file));
  assert.ok(
    adapters.includes(profile.adapter),
    `${file}: adapter "${profile.adapter}" has no baseline here (have: ${adapters.join(", ")})`,
  );
  const config = compose(profile);

  for (const field of REQUIRED) {
    assert.ok(config[field] !== undefined, `${file}: missing ${field}`);
  }
  assert.ok(config.rules.length > 0, `${file}: no rules`);
  assert.equal(config.agents.length, 7, `${file}: expected 7 roles`);
  const roles = config.agents.map((a) => a.role);
  for (const role of ROLES) assert.ok(roles.includes(role), `${file}: missing role ${role}`);
  assert.equal(config.project.name, profile.projectName, `${file}: project.name mismatch`);

  // The gate must stay read-only. This is the constraint the whole split exists to protect:
  // give EVALUATE Write or Bash and the builder can grade its own output.
  const gate = config.agents.find((a) => a.role === "EVALUATE");
  assert.equal(gate.permissionMode, "plan", `${file}: gate is not plan mode`);
  assert.ok(!gate.tools.includes("Write"), `${file}: gate has Write`);
  assert.ok(!gate.tools.includes("Edit"), `${file}: gate has Edit`);
  assert.ok(!gate.tools.includes("Bash"), `${file}: gate has Bash`);
}

// Overrides win over adapter defaults, without clobbering sibling default keys.
const adapter = adapters[0];
const overridden = compose({
  key: "t",
  adapter,
  projectName: "t",
  overrides: { loops: { gateRepairLimit: 9 }, context: { effortLevel: "low" } },
});
assert.equal(overridden.loops.gateRepairLimit, 9, "loops override ignored");
assert.equal(overridden.context.effortLevel, "low", "context override ignored");
assert.equal(overridden.context.autoMemoryEnabled, true, "override clobbered sibling defaults");

// A profile missing required facts fails loudly rather than emitting a broken config.
assert.throws(() => compose({ key: "x", adapter }), /projectName/);
assert.throws(() => compose({ key: "x", projectName: "y" }), /adapter/);
assert.throws(() => compose({ key: "x", adapter: "nope", projectName: "y" }), /Unknown adapter/);

console.log(
  `[profile] ${profiles.length} profile(s), ${adapters.length} adapter(s) — all checks passed`,
);
