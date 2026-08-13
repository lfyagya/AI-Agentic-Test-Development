#!/usr/bin/env node
/**
 * Requirement-registry consistency guard.
 *
 * `evidence:build` already enforces that ids are unique *within* this branch's
 * `evidence/requirements.json`. It cannot see other branches, so two branches can each define the
 * same id for different behavior — exactly what happened when two PRs both introduced
 * `AE-PRODUCTS-001` (one for an API contract, one for a UI grid). Whichever merges second silently
 * redefines the id.
 *
 * This check compares the local registry against the base branch (default origin/main). When an id
 * exists in both but its meaning diverges, it fails. The collision therefore surfaces the moment the
 * second branch is checked against a base that already carries the first definition — deterministic,
 * offline-safe (skips when the base ref is unavailable), and free of any network dependency.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, readJson } from "./lib/cli.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPARED_FIELDS = [
  "module",
  "title",
  "expectedOutcome",
  "acceptanceCriteria",
  "preconditions",
];

function canonical(requirement) {
  return JSON.stringify(
    Object.fromEntries(
      COMPARED_FIELDS.map((field) => [field, requirement[field] ?? null]),
    ),
  );
}

function loadLocal() {
  const registry = readJson(path.join(root, "evidence", "requirements.json"));
  if (registry?.version !== 1 || !Array.isArray(registry.requirements)) {
    throw new Error(
      "evidence/requirements.json must contain version 1 and requirements[]",
    );
  }
  return registry.requirements;
}

function loadBase(baseRef) {
  let raw;
  try {
    raw = execFileSync(
      "git",
      ["show", `${baseRef}:evidence/requirements.json`],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    return null;
  }
  try {
    const registry = JSON.parse(raw);
    return Array.isArray(registry?.requirements) ? registry.requirements : [];
  } catch {
    return [];
  }
}

const args = parseArgs(process.argv.slice(2));
const baseRef =
  typeof args["base-ref"] === "string" ? args["base-ref"] : "origin/main";

const local = loadLocal();

const localIds = new Set();
for (const requirement of local) {
  if (!requirement.id || localIds.has(requirement.id)) {
    console.error(
      `[requirements] duplicate or missing id in evidence/requirements.json: ${requirement.id ?? "<missing>"}`,
    );
    process.exit(1);
  }
  localIds.add(requirement.id);
}

const base = loadBase(baseRef);
if (base === null) {
  console.log(
    `[requirements] base ref ${baseRef} unavailable; skipped cross-branch check (in-file ids unique).`,
  );
  process.exit(0);
}

const baseById = new Map(
  base.map((requirement) => [requirement.id, requirement]),
);
const divergent = [];
for (const requirement of local) {
  const baseRequirement = baseById.get(requirement.id);
  if (
    baseRequirement &&
    canonical(baseRequirement) !== canonical(requirement)
  ) {
    divergent.push(requirement.id);
  }
}

if (divergent.length > 0) {
  console.error(
    `[requirements] id(s) redefined versus ${baseRef}: ${divergent.join(", ")}. ` +
      "Give the new behavior a fresh requirement id instead of reusing one that already means " +
      "something else on the base branch.",
  );
  process.exit(1);
}

console.log(
  `[requirements] ${local.length} requirement(s) consistent with ${baseRef}; no id reused for a different behavior.`,
);
