import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERATED_AGENT_MARKER,
  GENERATED_HOOK_MARKER,
  adapterEnabled,
  agentInstructions,
  claudeAgent,
  claudeSettingsText,
  copilotAgent,
  copilotHooksText,
  copilotInstructions,
  injectRules,
  readConfig,
} from "./templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = readConfig(root);
const failures = [];

function check(relativePath, expected) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== expected) {
    failures.push(relativePath);
  }
}

function checkOwnedAbsent(relativePath, marker) {
  const target = path.join(root, relativePath);
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8").includes(marker)) {
    failures.push(relativePath);
  }
}

function checkGeneratedDirectory(relativeDirectory, expected) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    const content = fs.readFileSync(path.join(directory, entry.name), "utf8");
    if (content.includes(GENERATED_AGENT_MARKER) && !expected.has(relativePath)) {
      failures.push(relativePath);
    }
  }
}

const claudeAgents = new Set();
const copilotAgents = new Set();
const extension = config.agentFileExtension ?? ".agent.md";

for (const agent of config.agents) {
  const instructions = agentInstructions(root, config, agent);
  if (adapterEnabled(config, "claude")) {
    const target = path.join(".claude", "agents", `${agent.name}.md`);
    claudeAgents.add(target);
    check(target, claudeAgent(agent, instructions));
  }
  if (adapterEnabled(config, "copilot")) {
    const target = path.join(".github", "agents", `${agent.name}${extension}`);
    copilotAgents.add(target);
    check(target, copilotAgent(agent, instructions));
  }
}

checkGeneratedDirectory(path.join(".claude", "agents"), claudeAgents);
checkGeneratedDirectory(path.join(".github", "agents"), copilotAgents);

if (adapterEnabled(config, "claude")) {
  check(".claude/settings.json", claudeSettingsText(config));
} else {
  checkOwnedAbsent(".claude/settings.json", '"_generated"');
}

if (adapterEnabled(config, "copilot")) {
  check(".github/copilot-instructions.md", copilotInstructions(config));
  check(".github/hooks/harness.json", copilotHooksText(config));
} else {
  checkOwnedAbsent(".github/copilot-instructions.md", "GENERATED FROM harness.config.json");
  checkOwnedAbsent(".github/hooks/harness.json", GENERATED_HOOK_MARKER);
}

for (const doc of ["CLAUDE.md", "README.md"]) {
  const actual = fs.readFileSync(path.join(root, doc), "utf8");
  const expected = injectRules(actual, config);
  if (!expected || actual !== expected) failures.push(doc);
}

if (failures.length) {
  console.error(`Harness drift: ${[...new Set(failures)].join(", ")}`);
  process.exit(1);
}
console.log("Harness projections are in sync.");
