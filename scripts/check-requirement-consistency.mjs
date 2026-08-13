#!/usr/bin/env node
/**
 * Requirement-registry consistency guard.
 *
 * `evidence:build` enforces uniqueness only inside one branch. This check also verifies that specs
 * reference active local ids and that an id already on the base branch is not redefined for a
 * different behavior.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, readJson } from "./lib/cli.mjs";

const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const COMPARED_FIELDS = [
  "module",
  "title",
  "expectedOutcome",
  "acceptanceCriteria",
  "preconditions",
];

export function canonical(requirement) {
  return JSON.stringify(
    Object.fromEntries(
      COMPARED_FIELDS.map((field) => [field, requirement[field] ?? null]),
    ),
  );
}

export function validateLocalRequirements(requirements) {
  const ids = new Set();
  const activeIds = new Set();
  for (const requirement of requirements) {
    if (!requirement.id || ids.has(requirement.id)) {
      throw new Error(
        `duplicate or missing id in evidence/requirements.json: ${requirement.id ?? "<missing>"}`,
      );
    }
    ids.add(requirement.id);
    if (requirement.status === "active") activeIds.add(requirement.id);
  }
  return activeIds;
}

export function findDivergentRequirements(local, base) {
  const baseById = new Map(
    base.map((requirement) => [requirement.id, requirement]),
  );
  return local
    .filter((requirement) => {
      const baseRequirement = baseById.get(requirement.id);
      return (
        baseRequirement && canonical(baseRequirement) !== canonical(requirement)
      );
    })
    .map((requirement) => requirement.id);
}

export function loadBaseRequirements(baseRef, repoRoot = DEFAULT_ROOT) {
  let raw;
  try {
    raw = execFileSync(
      "git",
      ["show", `${baseRef}:evidence/requirements.json`],
      {
        cwd: repoRoot,
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

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.cy\.(?:m|c)?[jt]s$/i.test(entry.name) ? [fullPath] : [];
  });
}

export function findUnknownSpecRequirementIds(
  repoRoot,
  activeIds,
  readFile = (file) => fs.readFileSync(file, "utf8"),
) {
  const unknown = new Set();
  const testTitle =
    /\b(?:it|specify)(?:\.\w+)?\s*\(\s*(['"`])\s*\[([^\]]+)\][\s\S]*?\1/g;
  for (const file of walk(path.join(repoRoot, "cypress", "tests"))) {
    const content = readFile(file);
    let match;
    while ((match = testTitle.exec(content)) !== null) {
      if (!activeIds.has(match[2])) unknown.add(match[2]);
    }
  }
  return [...unknown].sort();
}

export function checkRequirements({
  repoRoot = DEFAULT_ROOT,
  baseRef = "origin/main",
} = {}) {
  const registry = readJson(
    path.join(repoRoot, "evidence", "requirements.json"),
  );
  if (registry?.version !== 1 || !Array.isArray(registry.requirements)) {
    throw new Error(
      "evidence/requirements.json must contain version 1 and requirements[]",
    );
  }

  const local = registry.requirements;
  const activeIds = validateLocalRequirements(local);
  const unknown = findUnknownSpecRequirementIds(repoRoot, activeIds);
  if (unknown.length > 0) {
    throw new Error(
      `spec requirement id(s) are not active in evidence/requirements.json: ${unknown.join(", ")}`,
    );
  }

  const base = loadBaseRequirements(baseRef, repoRoot);
  if (base === null) {
    return {
      localCount: local.length,
      baseAvailable: false,
      baseRef,
    };
  }

  const divergent = findDivergentRequirements(local, base);
  if (divergent.length > 0) {
    throw new Error(
      `id(s) redefined versus ${baseRef}: ${divergent.join(", ")}. ` +
        "Give the new behavior a fresh requirement id instead of reusing one that already means " +
        "something else on the base branch.",
    );
  }

  return {
    localCount: local.length,
    baseAvailable: true,
    baseRef,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = checkRequirements({
      baseRef:
        typeof args["base-ref"] === "string" ? args["base-ref"] : "origin/main",
    });
    if (!result.baseAvailable) {
      console.log(
        `[requirements] base ref ${result.baseRef} unavailable; skipped cross-branch check ` +
          "(in-file ids unique; spec ids active).",
      );
    } else {
      console.log(
        `[requirements] ${result.localCount} requirement(s) consistent with ${result.baseRef}; ` +
          "spec ids active and no id reused for a different behavior.",
      );
    }
  } catch (error) {
    console.error(`[requirements] ${error.message}`);
    process.exit(1);
  }
}
