/**
 * Single source of truth for every generated adapter.
 *
 * This file is byte-identical in the Cypress and Playwright boilerplates. Repository-specific
 * policy and role prompts come from harness.config.json and harness/agents/.
 */

import fs from "node:fs";
import path from "node:path";

export const RULES_START = "<!-- HARNESS:RULES:START -->";
export const RULES_END = "<!-- HARNESS:RULES:END -->";
export const GENERATED_AGENT_MARKER =
  "<!-- GENERATED FROM harness.config.json and harness/agents/. DO NOT EDIT. -->";
export const GENERATED_HOOK_MARKER = "HARNESS_GENERATED_FROM";

const SUPPORTED_FRAMEWORKS = new Set(["cypress", "playwright"]);
const SUPPORTED_AGENT_EXTENSIONS = new Set([".md", ".agent.md"]);
const SUPPORTED_ENFORCEMENT = new Set(["Hook + CI", "CI", "QA gate"]);
const COPILOT_TOOL_ALIASES = {
  Agent: "agent",
  Bash: "execute",
  Edit: "edit",
  Glob: "search",
  Grep: "search",
  PowerShell: "execute",
  Read: "read",
  Task: "agent",
  TodoWrite: "todo",
  WebFetch: "web",
  WebSearch: "web",
  Write: "edit",
};

function requireValue(condition, message) {
  if (!condition) throw new Error(`Invalid harness.config.json: ${message}`);
}

function validateConfig(config) {
  requireValue(config?.version === 1, "version must be 1");
  requireValue(
    SUPPORTED_FRAMEWORKS.has(config.framework),
    "framework must be cypress or playwright",
  );
  requireValue(
    config.adapters && typeof config.adapters === "object",
    "adapters must be an object",
  );
  for (const adapter of ["claude", "copilot"]) {
    requireValue(
      typeof config.adapters?.[adapter]?.enabled === "boolean",
      `adapters.${adapter}.enabled must be boolean`,
    );
  }

  const extension = config.agentFileExtension ?? ".agent.md";
  requireValue(
    SUPPORTED_AGENT_EXTENSIONS.has(extension),
    "agentFileExtension must be .md or .agent.md",
  );
  requireValue(Array.isArray(config.rules) && config.rules.length > 0, "rules must not be empty");
  requireValue(
    Array.isArray(config.agents) && config.agents.length > 0,
    "agents must not be empty",
  );
  requireValue(
    Number.isInteger(config.loops?.gateRepairLimit) &&
      config.loops.gateRepairLimit >= 1 &&
      config.loops.gateRepairLimit <= 8,
    "loops.gateRepairLimit must be an integer from 1 to 8",
  );
  requireValue(
    typeof config.qaFoundations === "string" && config.qaFoundations.length > 0,
    "qaFoundations must be a path",
  );

  const ruleIds = new Set();
  for (const rule of config.rules) {
    requireValue(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id), `invalid rule id: ${rule.id}`);
    requireValue(!ruleIds.has(rule.id), `duplicate rule id: ${rule.id}`);
    requireValue(
      SUPPORTED_ENFORCEMENT.has(rule.enforcement),
      `${rule.id}.enforcement must be Hook + CI, CI, or QA gate`,
    );
    ruleIds.add(rule.id);
  }

  const agentNames = new Set();
  for (const agent of config.agents) {
    requireValue(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent.name),
      `invalid agent name: ${agent.name}`,
    );
    requireValue(!agentNames.has(agent.name), `duplicate agent name: ${agent.name}`);
    requireValue(
      Array.isArray(agent.tools) && agent.tools.length > 0,
      `${agent.name}.tools must be a non-empty array`,
    );
    agentNames.add(agent.name);
  }

  return config;
}

export function readConfig(repoRoot) {
  const configPath = path.join(repoRoot, "harness.config.json");
  return validateConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
}

export function adapterEnabled(config, adapter) {
  return config.adapters?.[adapter]?.enabled === true;
}

function generatedBanner() {
  return "<!-- GENERATED FROM harness.config.json — DO NOT EDIT. Change harness.config.json, then run npm run harness:sync. npm run harness:check fails on drift. -->";
}

/**
 * Resolve Claude hooks from the trusted project root exposed by the client. cwd is only the
 * fallback for clients that do not provide a project-root variable.
 */
function hookCommand(script) {
  const loader =
    "const p=require('node:path'),u=require('node:url');" +
    "const r=process.env.CURSOR_PROJECT_DIR||process.env.CLAUDE_PROJECT_DIR||process.cwd();" +
    "import(u.pathToFileURL(p.join(r,'.claude','hooks',process.argv[1])).href)";
  return { type: "command", command: `node -e "${loader}" "${script}"` };
}

const group = (scripts, matcher) => [
  { ...(matcher ? { matcher } : {}), hooks: scripts.map(hookCommand) },
];

export function claudeSettings(config) {
  const h = config.hooks ?? {};
  const hooks = {};
  if (h.sessionStart?.length) hooks.SessionStart = group(h.sessionStart);
  if (h.prompt?.length) hooks.UserPromptSubmit = group(h.prompt);
  if (h.preWrite?.length) hooks.PreToolUse = group(h.preWrite, "Edit|Write");
  if (h.postWrite?.length) hooks.PostToolUse = group(h.postWrite, "Edit|Write");
  if (h.stop?.length) hooks.Stop = group(h.stop);

  return {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    _generated: "From harness.config.json by scripts/harness/sync.mjs. Do not edit.",
    hooks,
    ...config.context,
    permissions: config.permissions,
    ...(config.env ? { env: config.env } : {}),
  };
}

export const claudeSettingsText = (config) =>
  `${JSON.stringify(claudeSettings(config), null, 2)}\n`;

function copilotHook(script) {
  return {
    type: "command",
    command: `node .claude/hooks/${script}`,
    cwd: ".",
    timeoutSec: 30,
    env: { [GENERATED_HOOK_MARKER]: "harness.config.json" },
  };
}

export function copilotHooks(config) {
  const h = config.hooks ?? {};
  const hooks = {};
  if (h.preWrite?.length) {
    hooks.PreToolUse = h.preWrite.map((script) => ({
      matcher: "Edit|Write",
      ...copilotHook(script),
    }));
  }
  if (h.postWrite?.length) {
    hooks.PostToolUse = h.postWrite.map((script) => ({
      matcher: "Edit|Write",
      ...copilotHook(script),
    }));
  }
  return { version: 1, hooks };
}

export const copilotHooksText = (config) => `${JSON.stringify(copilotHooks(config), null, 2)}\n`;

export function rulesBlock(config) {
  const width = Math.max(...config.rules.map((rule) => rule.never.length));
  const lines = config.rules.map(
    (rule) => `NEVER  →  ${rule.never.padEnd(width)}   ${rule.instead}`,
  );
  return [
    RULES_START,
    "<!-- Generated from harness.config.json — run `npm run harness:sync`. Do not edit by hand. -->",
    "",
    "```text",
    ...lines,
    "```",
    "",
    "| Rule | Why it exists | Enforcement |",
    "|---|---|---|",
    ...config.rules.map((rule) => `| \`${rule.id}\` | ${rule.why} | ${rule.enforcement} |`),
    "",
    RULES_END,
  ].join("\n");
}

export function copilotInstructions(config) {
  const project = config.project;
  return `${generatedBanner()}

# GitHub Copilot Instructions — ${project.name}

Architecture: **${project.architecture}**. Read \`CLAUDE.md\` for the full framework contract and
\`docs/application-intelligence/<module>/module-context.md\` for what the application does.

## Non-negotiable rules

${config.rules
  .map(
    (rule) =>
      `- **${rule.id}** (${rule.enforcement}) — never ${rule.never}; use ${rule.instead}. ${rule.why}`,
  )
  .join("\n")}

Edit and Write tool calls are checked by the generated repository hooks. CI rescans repository
changes as the final backstop; shell commands are not represented as Edit or Write tool calls.

## Agents

${config.agents.map((agent) => `- \`${agent.name}\` (${agent.role}) — ${agent.when}`).join("\n")}

${config.agents.find((agent) => agent.readOnlyRationale)?.readOnlyRationale ?? ""}

## Where things live

| Layer | Path |
|---|---|
| Config | \`${project.configRoot}\` |
| ${config.framework === "cypress" ? "Commands" : "Helpers"} | \`${project.commandRoot}\` |
| Tests | \`${project.specGlob}\` |
`;
}

export function agentInstructions(repoRoot, config, agent) {
  const source = agent.instructions ?? `harness/agents/${agent.name}.md`;
  const agentRoot = path.resolve(repoRoot, "harness", "agents");
  const resolved = path.resolve(repoRoot, source);
  const relative = path.relative(agentRoot, resolved);
  requireValue(
    relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    `${agent.name}.instructions must resolve inside harness/agents`,
  );
  const foundationsPath = path.resolve(repoRoot, config.qaFoundations);
  const foundationsRelative = path.relative(path.resolve(repoRoot, "harness"), foundationsPath);
  requireValue(
    foundationsRelative &&
      !foundationsRelative.startsWith("..") &&
      !path.isAbsolute(foundationsRelative),
    "qaFoundations must resolve inside harness/",
  );
  const foundations = fs.readFileSync(foundationsPath, "utf8").replace(/\r\n/g, "\n").trim();
  return fs
    .readFileSync(resolved, "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .replaceAll("{{gateRepairLimit}}", String(config.loops.gateRepairLimit))
    .replaceAll("{{qaFoundations}}", foundations);
}

export function claudeAgent(agent, instructions) {
  const frontmatter = [
    "---",
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agent.description)}`,
    ...(agent.model ? [`model: ${agent.model}`] : []),
    ...(agent.permissionMode ? [`permissionMode: ${agent.permissionMode}`] : []),
    "tools:",
    ...agent.tools.map((tool) => `  - ${tool}`),
    "---",
  ];
  return `${frontmatter.join("\n")}\n\n${GENERATED_AGENT_MARKER}\n\n${instructions}\n`;
}

export function copilotTools(agent) {
  return [...new Set(agent.tools.map((tool) => COPILOT_TOOL_ALIASES[tool]).filter(Boolean))];
}

export function copilotAgent(agent, instructions) {
  const tools = copilotTools(agent);
  const frontmatter = [
    "---",
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agent.description)}`,
    `tools: ${JSON.stringify(tools)}`,
    "---",
  ];
  return `${frontmatter.join("\n")}\n\n${GENERATED_AGENT_MARKER}\n\n${instructions}\n`;
}

export function injectRules(existingText, config) {
  const start = existingText.indexOf(RULES_START);
  const end = existingText.indexOf(RULES_END);
  if (start === -1 || end === -1 || end < start) return null;
  if (existingText.indexOf(RULES_START, start + RULES_START.length) !== -1) return null;
  if (existingText.indexOf(RULES_END, end + RULES_END.length) !== -1) return null;
  return (
    existingText.slice(0, start) + rulesBlock(config) + existingText.slice(end + RULES_END.length)
  );
}
