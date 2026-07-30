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

function write(relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
    fs.writeFileSync(target, content, "utf8");
    console.log(`updated ${relativePath}`);
  }
}

function removeOwned(relativePath, marker) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return;
  if (!fs.readFileSync(target, "utf8").includes(marker)) return;
  fs.rmSync(target);
  console.log(`removed ${relativePath}`);
}

function reconcileAgentDirectory(relativeDirectory, expected) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    const content = fs.readFileSync(path.join(directory, entry.name), "utf8");
    if (content.includes(GENERATED_AGENT_MARKER) && !expected.has(relativePath)) {
      fs.rmSync(path.join(directory, entry.name));
      console.log(`removed ${relativePath}`);
    }
  }
}

function syncRules(relativePath) {
  const target = path.join(root, relativePath);
  const content = injectRules(fs.readFileSync(target, "utf8"), config);
  if (!content) throw new Error(`${relativePath} needs exactly one HARNESS:RULES marker pair`);
  write(relativePath, content);
}

const claudeAgents = new Set();
const copilotAgents = new Set();
const extension = config.agentFileExtension ?? ".agent.md";

for (const agent of config.agents) {
  const instructions = agentInstructions(root, config, agent);
  if (adapterEnabled(config, "claude")) {
    const target = path.join(".claude", "agents", `${agent.name}.md`);
    claudeAgents.add(target);
    write(target, claudeAgent(agent, instructions));
  }
  if (adapterEnabled(config, "copilot")) {
    const target = path.join(".github", "agents", `${agent.name}${extension}`);
    copilotAgents.add(target);
    write(target, copilotAgent(agent, instructions));
  }
}

reconcileAgentDirectory(path.join(".claude", "agents"), claudeAgents);
reconcileAgentDirectory(path.join(".github", "agents"), copilotAgents);

if (adapterEnabled(config, "claude")) {
  write(".claude/settings.json", claudeSettingsText(config));
} else {
  removeOwned(".claude/settings.json", '"_generated"');
}

if (adapterEnabled(config, "copilot")) {
  write(".github/copilot-instructions.md", copilotInstructions(config));
  write(".github/hooks/harness.json", copilotHooksText(config));
} else {
  removeOwned(".github/copilot-instructions.md", "GENERATED FROM harness.config.json");
  removeOwned(".github/hooks/harness.json", GENERATED_HOOK_MARKER);
}

syncRules("CLAUDE.md");
syncRules("README.md");
