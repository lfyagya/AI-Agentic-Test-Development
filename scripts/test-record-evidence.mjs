#!/usr/bin/env node
// Self-check for the evidence recorder. Run: node scripts/test-record-evidence.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildEntry, parseNamedActions, record } from "./record-evidence.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "rec-"));
fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
fs.writeFileSync(
  path.join(root, "evidence", "requirements.json"),
  JSON.stringify({
    version: 1,
    requirements: [{ id: "REQ-1", status: "active" }],
  }),
);

// --- gate ---
const gate = buildEntry(
  "gate",
  { requirement: "REQ-1", attempt: "1", verdict: "pass" },
  root,
);
assert.equal(gate.verdict, "PASS", "verdict should upper-case");
assert.equal(gate.attempt, 1, "attempt should coerce to number");
assert.ok(gate.timestamp, "timestamp should default");
assert.throws(
  () => buildEntry("gate", { requirement: "REQ-1", verdict: "MAYBE" }, root),
  /verdict/,
);
assert.throws(
  () =>
    buildEntry(
      "gate",
      { requirement: "REQ-1", verdict: "PASS", attempt: "0" },
      root,
    ),
  /attempt/,
);
// An unknown id would be silently dropped by evidence.mjs — catch it at write time instead.
assert.throws(
  () => buildEntry("gate", { requirement: "NOPE", verdict: "PASS" }, root),
  /Unknown requirement/,
);

// PASS_WITH_ACTIONS is merge-ready with required named follow-ups preserved on the row.
assert.deepEqual(parseNamedActions("docs|cleanup trailing"), [
  "docs",
  "cleanup trailing",
]);
assert.deepEqual(parseNamedActions("  lone  "), ["lone"]);
assert.deepEqual(parseNamedActions(undefined), []);
const withActions = buildEntry(
  "gate",
  {
    requirement: "REQ-1",
    attempt: "1",
    verdict: "PASS_WITH_ACTIONS",
    actions: "update CI guide|clarify billing note",
    resolution: "tracked in maintainer backlog",
  },
  root,
);
assert.equal(withActions.verdict, "PASS_WITH_ACTIONS");
assert.deepEqual(withActions.actions, [
  "update CI guide",
  "clarify billing note",
]);
assert.equal(withActions.resolution, "tracked in maintainer backlog");
assert.throws(
  () =>
    buildEntry(
      "gate",
      { requirement: "REQ-1", verdict: "PASS_WITH_ACTIONS" },
      root,
    ),
  /requires --actions/,
);
assert.throws(
  () =>
    buildEntry(
      "gate",
      { requirement: "REQ-1", verdict: "PASS", actions: "should not appear" },
      root,
    ),
  /only valid with --verdict PASS_WITH_ACTIONS/,
);
assert.throws(
  () =>
    buildEntry(
      "gate",
      {
        requirement: "REQ-1",
        verdict: "PASS",
        resolution: "not for PASS",
      },
      root,
    ),
  /only valid with --verdict PASS_WITH_ACTIONS/,
);
const plainPass = buildEntry(
  "gate",
  { requirement: "REQ-1", attempt: "1", verdict: "PASS" },
  root,
);
assert.equal(plainPass.actions, undefined);
assert.equal(plainPass.resolution, undefined);

// --- ci ---
const ci = buildEntry(
  "ci",
  { pipeline: "99", trigger: "PR", attempt: "1", outcome: "PASSED" },
  root,
);
assert.equal(ci.trigger, "pr");
assert.equal(ci.outcome, "passed");
assert.equal(ci.failureClass, null, "failureClass should default to null");
assert.throws(
  () =>
    buildEntry(
      "ci",
      { pipeline: "1", trigger: "nightly", outcome: "passed" },
      root,
    ),
  /trigger/,
);
assert.throws(
  () =>
    buildEntry("ci", { pipeline: "1", trigger: "pr", outcome: "green" }, root),
  /outcome/,
);
assert.throws(
  () => buildEntry("ci", { trigger: "pr", outcome: "passed" }, root),
  /pipeline/,
);
// A passed run carrying a failure class is incoherent and would skew M2's exclusion logic.
assert.throws(
  () =>
    buildEntry(
      "ci",
      {
        pipeline: "1",
        trigger: "pr",
        outcome: "passed",
        "failure-class": "ENV",
      },
      root,
    ),
  /only meaningful/,
);

assert.throws(() => buildEntry("bogus", {}, root), /Unknown ledger/);

// --- append + duplicate guard ---
const first = record(
  "gate",
  { requirement: "REQ-1", attempt: "1", verdict: "PASS" },
  root,
);
assert.equal(first.total, 1);
assert.throws(
  () =>
    record(
      "gate",
      { requirement: "REQ-1", attempt: "1", verdict: "PASS" },
      root,
    ),
  /Duplicate gate entry/,
  "a repeat append must be refused — it would inflate M1",
);
// A genuinely different attempt is not a duplicate.
assert.equal(
  record("gate", { requirement: "REQ-1", attempt: "2", verdict: "PASS" }, root)
    .total,
  2,
);
// --force is the deliberate escape hatch.
assert.equal(
  record(
    "gate",
    { requirement: "REQ-1", attempt: "2", verdict: "PASS", force: true },
    root,
  ).total,
  3,
);

// --- the ledger evidence.mjs reads must be valid JSONL ---
const lines = fs
  .readFileSync(path.join(root, "evidence", "gate-log.jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean);
assert.equal(lines.length, 3);
for (const line of lines) JSON.parse(line);

// No registry at all is a valid bootstrap state and must not block recording.
const bare = fs.mkdtempSync(path.join(os.tmpdir(), "rec-bare-"));
assert.ok(
  buildEntry("gate", { requirement: "ANY-1", verdict: "PASS" }, bare)
    .requirementId,
);

fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(bare, { recursive: true, force: true });
console.log("[record] all checks passed");
