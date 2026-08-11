#!/usr/bin/env node
// Composes a project profile + its adapter baseline into a repo's harness.config.json.
//
//   node compose-harness-config.mjs --profile <profile.json> --out <repo>/harness.config.json
//   node compose-harness-config.mjs --profile <profile.json> --verify <repo>/harness.config.json
//
// --verify deep-compares instead of writing, so you can prove the profile layer reproduces a
// working config before adopting it. Exits 1 on any difference and prints the differing paths.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, readJson } from "../../../scripts/lib/cli.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADAPTERS = path.join(HERE, "..", "adapters");

// Which AI tools a team uses is a project fact, so it belongs at the top level of the profile beside
// `owner` and `language` — not buried in `overrides`, which reads as "an exception to policy".
// `overrides.adapters` is still honoured so existing profiles keep working.
function resolveAdapters(profile, base) {
  const resolved =
    profile.adapters ?? profile.overrides?.adapters ?? base.defaults.adapters;
  const enabled = Object.entries(resolved).filter(([, v]) => v?.enabled);
  if (enabled.length === 0) {
    throw new Error(
      `profile "${profile.key}" enables no AI adapter. That composes a harness with no agents, ` +
        `no generated instructions, and no write-time hooks wired to any tool — every rule would ` +
        `still be declared and none would reach anything. Enable at least one of: ` +
        `${Object.keys(resolved).join(", ")}.`,
    );
  }
  return resolved;
}

export function compose(profile, adaptersDir = ADAPTERS) {
  if (!profile.adapter) throw new Error("profile.adapter is required");
  const baselineFile = path.join(adaptersDir, `${profile.adapter}.json`);
  if (!fs.existsSync(baselineFile)) {
    throw new Error(
      `Unknown adapter "${profile.adapter}" — no ${baselineFile}`,
    );
  }
  const base = readJson(baselineFile);
  const over = profile.overrides ?? {};

  if (!profile.projectName) throw new Error("profile.projectName is required");

  const config = {
    $comment:
      `GENERATED from docs/harness/profiles by compose-harness-config.mjs. ` +
      `Policy lives in the adapter baseline (${profile.adapter}.json); project facts live in ` +
      `the profile (${profile.key}). Re-compose after editing either, then run npm run harness:sync.`,
    version: base.version,
    framework: base.framework,
    ...(base.agentFileExtension
      ? { agentFileExtension: base.agentFileExtension }
      : {}),
    adapters: resolveAdapters(profile, base),
    project: {
      name: profile.projectName,
      architecture: base.architecture,
      testRoot: base.paths.testRoot,
      configRoot: base.paths.configRoot,
      commandRoot: base.paths.commandRoot,
      specGlob: base.paths.specGlob,
    },
    context: { ...base.defaults.context, ...(over.context ?? {}) },
    ...(base.defaults.env || over.env
      ? { env: { ...(base.defaults.env ?? {}), ...(over.env ?? {}) } }
      : {}),
    loops: { ...base.defaults.loops, ...(over.loops ?? {}) },
    qaFoundations: base.qaFoundations,
    rules: base.rules,
    agents: base.agents,
    hooks: base.hooks,
    ...(base.skills ? { skills: base.skills } : {}),
    permissions: over.permissions ?? base.permissions,
  };
  return config;
}

// Deep diff that reports paths, not just "not equal".
function diff(a, b, at = "", out = []) {
  const bothObjects =
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b);
  if (bothObjects) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      diff(a[k], b[k], at ? `${at}.${k}` : k, out);
    }
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(at || "<root>");
  return out;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.profile) throw new Error("--profile is required");
    const composed = compose(readJson(args.profile));

    if (args.verify) {
      const live = readJson(args.verify);
      // $comment is provenance text, not policy — never a real difference.
      const differences = diff(
        { ...composed, $comment: 0 },
        { ...live, $comment: 0 },
      );
      if (differences.length > 0) {
        console.error(`[profile] MISMATCH vs ${args.verify}:`);
        for (const d of differences) console.error(`  ${d}`);
        process.exit(1);
      }
      console.log(
        `[profile] ${path.basename(args.profile)} reproduces ${args.verify} exactly.`,
      );
      process.exit(0);
    }

    if (!args.out) throw new Error("--out or --verify is required");
    fs.writeFileSync(
      args.out,
      `${JSON.stringify(composed, null, 2)}\n`,
      "utf8",
    );
    console.log(
      `[profile] wrote ${args.out} from ${path.basename(args.profile)}`,
    );
  } catch (error) {
    console.error(`[profile] ${error.message}`);
    process.exit(1);
  }
}
