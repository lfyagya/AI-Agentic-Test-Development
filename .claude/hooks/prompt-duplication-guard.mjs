#!/usr/bin/env node

// Intercepts prompts that intend to create new Cypress code and injects
// a duplication-check instruction before Claude starts writing anything.

const ACTION_WORDS = [
  "create",
  "add",
  "new",
  "write",
  "build",
  "generate",
  "scaffold",
  "implement",
  "make",
  "introduce",
  "set up",
  "setup",
];

const CYPRESS_CONTEXT_WORDS = [
  "command",
  "spec",
  "config",
  "test",
  "selector",
  "endpoint",
  "route",
  "helper",
  "util",
  "utility",
  "module",
  "smoke",
  "api config",
  "ui config",
  "commands file",
  "cy.",
  "cypress",
];

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = String(data?.prompt || "").toLowerCase();
  if (!prompt) process.exit(0);

  const hasAction = ACTION_WORDS.some((w) => prompt.includes(w));
  const hasCypressContext = CYPRESS_CONTEXT_WORDS.some((w) =>
    prompt.includes(w),
  );

  if (!hasAction || !hasCypressContext) process.exit(0);

  console.log(
    "DUPLICATION GUARD (auto-triggered): Before writing any new Cypress " +
      "config, command, helper, utility, or spec — you MUST search first, by " +
      "VALUE, not by filename or module-naming convention. The same selector, " +
      "endpoint, or route string can already exist in a differently-named or " +
      "differently-organized file — cypress/configs/ui/modules/[name]/ is the " +
      "expected location, not a search boundary. Grep the literal string (the " +
      "data-cy value, the endpoint path, the route) across all of " +
      "cypress/configs/**, cypress/configs/app/routes.js, and " +
      "cypress/support/commands/** — do not stop at the one folder that " +
      "matches this module's name. " +
      "If a match exists anywhere: REUSE or EXTEND it — do not create a new " +
      "file just because it isn't where you expected it. " +
      "If genuinely no match exists after a value-level search: state exactly " +
      "why a new file is justified before writing anything. Do not approve " +
      "new *.actions.js files or page-object wrappers. Only proceed to write " +
      "code after this check is complete.",
  );

  process.exit(0);
}

main();
