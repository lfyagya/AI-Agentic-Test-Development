#!/usr/bin/env node
// Refresh the canonical Cypress skill trees under harness/skills/cypress/ from the upstream
// cypress-io/ai-toolkit repository. After refresh, run harness:compose && harness:sync so the
// two projections (.claude/skills and .agents/skills) match the new canon.
//
//   npm run harness:skills            # refresh canon from upstream
//   npm run harness:skills -- --list  # print declared skills only

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "harness.config.json"), "utf8"));
const skills = Array.isArray(config.skills) ? config.skills : [];
const listOnly = process.argv.slice(2).includes("--list");
const canonRoot = path.join(root, "harness", "skills", "cypress");

if (skills.length === 0) {
  console.log("[skills] harness.config.json declares no skills — nothing to refresh.");
  process.exit(0);
}

console.log(`[skills] declared in harness.config.json (${config.framework}):`);
for (const skill of skills) {
  console.log(
    `  - ${skill.name}@${skill.version} — ${skill.source} [roles: ${(skill.roles ?? []).join(", ")}]`,
  );
}

if (listOnly) {
  console.log("\n[skills] --list: would refresh harness/skills/cypress/* from cypress-io/ai-toolkit");
  process.exit(0);
}

const upstreams = [
  ...new Set(skills.map((skill) => skill.upstream ?? "cypress-io/ai-toolkit")),
];
if (upstreams.length !== 1 || upstreams[0] !== "cypress-io/ai-toolkit") {
  console.error(
    `[skills] refresh currently supports only cypress-io/ai-toolkit (got: ${upstreams.join(", ")})`,
  );
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-skills-"));
try {
  console.log("\n[skills] fetching cypress-io/ai-toolkit/skills ...");
  const result = spawnSync(
    "npx",
    ["--yes", "degit", "cypress-io/ai-toolkit/skills", tmp, "--force"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    console.error("[skills] degit failed — refresh aborted.");
    process.exit(1);
  }

  fs.mkdirSync(canonRoot, { recursive: true });
  for (const skill of skills) {
    const name = skill.name;
    const from = path.join(tmp, name);
    const to = path.join(canonRoot, name);
    if (!fs.existsSync(from)) {
      console.error(`[skills] upstream is missing ${name}`);
      process.exit(1);
    }
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
    console.log(`[skills] refreshed ${path.relative(root, to)}`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(
  "\n[skills] canon updated. Run: npm run harness:compose && npm run harness:sync && npm run harness:check",
);
