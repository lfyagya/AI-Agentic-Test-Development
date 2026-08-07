import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  adapterEnabled,
  agentInstructions,
  claudeAgent,
  copilotAgent,
  copilotHooks,
  copilotTools,
  readConfig,
} from "./templates.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..");
const config = readConfig(root);

assert.equal(adapterEnabled({ adapters: { claude: { enabled: false } } }, "claude"), false);
assert.equal(adapterEnabled({}, "claude"), false);

for (const agent of config.agents) {
  const instructions = agentInstructions(root, config, agent);
  assert.ok(instructions, `${agent.name} has no neutral instructions`);
  assert.ok(
    !instructions.startsWith("---"),
    `${agent.name} source must not contain tool frontmatter`,
  );
  if (adapterEnabled(config, "claude")) {
    assert.equal(
      fs.readFileSync(path.join(root, ".claude", "agents", `${agent.name}.md`), "utf8"),
      claudeAgent(agent, instructions),
    );
  }
  if (adapterEnabled(config, "copilot")) {
    assert.equal(
      fs.readFileSync(
        path.join(
          root,
          ".github",
          "agents",
          `${agent.name}${config.agentFileExtension ?? ".agent.md"}`,
        ),
        "utf8",
      ),
      copilotAgent(agent, instructions),
    );
  }
}

const gate = config.agents.find((agent) => agent.role === "EVALUATE");
assert.ok(gate, "EVALUATE agent is required");
const gateInstructions = agentInstructions(root, config, gate);
assert.match(gateInstructions, /at least 80\/100/);
assert.match(gateInstructions, /@P0/);
assert.match(gateInstructions, /never grades its own output/i);
assert.deepEqual(gate.tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(copilotTools(gate), ["read", "search"]);
assert.match(claudeAgent(gate, "gate"), /permissionMode: plan/);
assert.doesNotMatch(claudeAgent(gate, "gate"), /\n {2}- (Bash|Edit|Write)\n/);
assert.match(copilotAgent(gate, "gate"), /tools: \["read","search"\]/);

const builder = config.agents.find((agent) => agent.role === "BUILD");
assert.ok(builder, "BUILD agent is required");
const builderInstructions = agentInstructions(root, config, builder);
assert.match(builderInstructions, /SMOKE.*REGRESSION/s);
assert.match(builderInstructions, /failure-safe cleanup/);

const gatherer = config.agents.find((agent) => agent.role === "GATHER");
assert.ok(gatherer, "GATHER agent is required");
const gathererInstructions = agentInstructions(root, config, gatherer);
assert.match(gathererInstructions, /evidence\/requirements\.json/);
assert.match(gathererInstructions, /do not write tests/i);

const hooks = copilotHooks(config);
assert.equal(hooks.version, 1);
assert.ok(hooks.hooks.PreToolUse?.every((hook) => hook.matcher === "Edit|Write"));
assert.ok(
  hooks.hooks.PreToolUse?.every(
    (hook) => hook.env?.HARNESS_GENERATED_FROM === "harness.config.json",
  ),
);

assert.throws(
  () =>
    agentInstructions(root, config, {
      ...config.agents[0],
      instructions: "../package.json",
    }),
  /must resolve inside harness\/agents/,
);
assert.throws(
  () => agentInstructions(root, { ...config, qaFoundations: "../package.json" }, config.agents[0]),
  /qaFoundations must resolve inside harness\//,
);

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "harness-adapter-"));
try {
  const fixtureScripts = path.join(fixture, "scripts", "harness");
  fs.mkdirSync(fixtureScripts, { recursive: true });
  fs.mkdirSync(path.join(fixture, "harness", "agents"), { recursive: true });
  fs.copyFileSync(
    path.join(scriptDirectory, "templates.mjs"),
    path.join(fixtureScripts, "templates.mjs"),
  );
  fs.copyFileSync(path.join(scriptDirectory, "sync.mjs"), path.join(fixtureScripts, "sync.mjs"));

  const fixtureConfig = {
    version: 1,
    framework: "cypress",
    adapters: { claude: { enabled: true }, copilot: { enabled: true } },
    agentFileExtension: ".md",
    project: {
      name: "fixture",
      architecture: "Config → Commands → Tests",
      configRoot: "config",
      commandRoot: "commands",
      specGlob: "tests/**/*.js",
    },
    context: { effortLevel: "medium" },
    loops: { gateRepairLimit: 2 },
    qaFoundations: "harness/qa-automation-foundations.md",
    rules: [
      {
        id: "fixture-rule",
        severity: "block",
        enforcement: "Hook + CI",
        never: "bad",
        instead: "good",
        why: "fixture",
        message: "fixture",
      },
    ],
    agents: [
      {
        name: "old-agent",
        role: "BUILD",
        description: "fixture",
        tools: ["Read"],
        when: "fixture",
      },
    ],
    hooks: { preWrite: ["pre.mjs"], postWrite: ["post.mjs"] },
    permissions: { defaultMode: "plan", allow: [], deny: [] },
  };
  const configPath = path.join(fixture, "harness.config.json");
  fs.writeFileSync(configPath, `${JSON.stringify(fixtureConfig, null, 2)}\n`);
  fs.writeFileSync(
    path.join(fixture, "harness", "agents", "old-agent.md"),
    "limit={{gateRepairLimit}}\n{{qaFoundations}}\n",
  );
  fs.writeFileSync(path.join(fixture, "harness", "qa-automation-foundations.md"), "foundation\n");
  fs.writeFileSync(
    path.join(fixture, "CLAUDE.md"),
    "# Fixture\n\n<!-- HARNESS:RULES:START -->old<!-- HARNESS:RULES:END -->\n",
  );
  fs.writeFileSync(
    path.join(fixture, "README.md"),
    "# Fixture\n\n<!-- HARNESS:RULES:START -->old<!-- HARNESS:RULES:END -->\n",
  );

  const runSync = () =>
    spawnSync(process.execPath, [path.join(fixtureScripts, "sync.mjs")], {
      cwd: path.dirname(fixture),
      encoding: "utf8",
    });
  const enabledRun = runSync();
  assert.equal(enabledRun.status, 0, enabledRun.stderr);
  assert.match(
    fs.readFileSync(path.join(fixture, ".claude", "agents", "old-agent.md"), "utf8"),
    /limit=2\nfoundation/,
  );
  assert.ok(fs.existsSync(path.join(fixture, ".github", "hooks", "harness.json")));

  fixtureConfig.adapters.claude.enabled = false;
  fixtureConfig.adapters.copilot.enabled = false;
  fixtureConfig.agents = [
    {
      name: "new-agent",
      role: "BUILD",
      description: "fixture",
      tools: ["Read"],
      when: "fixture",
    },
  ];
  fs.writeFileSync(configPath, `${JSON.stringify(fixtureConfig, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "harness", "agents", "new-agent.md"), "new\n");

  const disabledRun = runSync();
  assert.equal(disabledRun.status, 0, disabledRun.stderr);
  assert.ok(!fs.existsSync(path.join(fixture, ".claude", "agents", "old-agent.md")));
  assert.ok(!fs.existsSync(path.join(fixture, ".github", "agents", "old-agent.md")));
  assert.ok(!fs.existsSync(path.join(fixture, ".claude", "settings.json")));
  assert.ok(!fs.existsSync(path.join(fixture, ".github", "copilot-instructions.md")));
  assert.ok(!fs.existsSync(path.join(fixture, ".github", "hooks", "harness.json")));
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
