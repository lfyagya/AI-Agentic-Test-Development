#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatReadyMessage, lockProjectProfile } from "./config-ready.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const result = lockProjectProfile(root);
if (result.ok) {
  console.log(`harness profile locked: ${result.path}`);
  process.exit(0);
}
console.error(formatReadyMessage(result));
process.exit(1);
