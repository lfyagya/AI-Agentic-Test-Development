#!/usr/bin/env node
import { execSync } from "node:child_process";

function runGit(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const changed = runGit("git diff --name-only HEAD");
const untracked = runGit("git ls-files --others --exclude-standard");
const allChanged = [changed, untracked].filter(Boolean).join("\n");

const hasCypressChanges = /cypress\//i.test(allChanged);

if (!hasCypressChanges) process.exit(0);

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Session ended with Cypress file changes.");
console.log("");
console.log("  Before opening a PR, run:");
console.log("  → pre-merge-qa-gate agent   full QA verdict");
console.log("");
console.log("  Pre-merge checklist:");
console.log("  [ ] No hardcoded selectors or endpoints");
console.log("  [ ] No cy.wait(number)");
console.log("  [ ] cy.ensureAuthenticated() in beforeEach()");
console.log("  [ ] No POST/PUT/PATCH/DELETE in smoke tests");
console.log("  [ ] New command registered in commands.js");
console.log("  [ ] Regression test added for any bug fix");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");

process.exit(0);
