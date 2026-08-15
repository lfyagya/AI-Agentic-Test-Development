#!/usr/bin/env node
// UserPromptSubmit — block work until the project profile is complete and locked.
// exit 2 = user sees the message, prompt is not processed.
import {
  CONFIGURE_RE,
  evaluateConfigReady,
  formatReadyMessage,
} from "../../scripts/engine/config-ready.mjs";

const root =
  process.env.CURSOR_PROJECT_DIR ||
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.CLAUDE_CWD ||
  process.cwd();

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const result = evaluateConfigReady(root);
  if (result.ok) process.exit(0);

  const prompt = String(payload.prompt ?? "");
  if (CONFIGURE_RE.test(prompt)) {
    console.log(formatReadyMessage(result, { allowConfigure: true }));
    process.exit(0);
  }

  console.error(formatReadyMessage(result));
  process.exit(2);
}

main();
