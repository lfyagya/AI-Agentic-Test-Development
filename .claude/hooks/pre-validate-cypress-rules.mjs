#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractToolChange,
  toPosix,
  loadAllowlist,
  scanContent,
} from "./shared-rules.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const allowlistPath = path.resolve(__dirname, "cypress-hook-allowlist.json");

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let toolData;
try {
  toolData = JSON.parse(raw);
} catch {
  process.exit(0);
}

const { filePath, content } = extractToolChange(toolData, repoRoot);
if (!filePath || !content) process.exit(0);

const allowlist = loadAllowlist(allowlistPath);
const violations = scanContent(filePath, content, allowlist, repoRoot);

if (violations.length === 0) process.exit(0);

console.error("");
console.error(
  "❌ [PRE-CHECK] Cypress rule violations in proposed change — edit BLOCKED.",
);
for (const v of violations) {
  console.error(`- ${toPosix(v.filePath)}:${v.lineNumber} -> ${v.message}`);
}
console.error("");
console.error("Fix violations before the write proceeds.");

process.exit(2);
