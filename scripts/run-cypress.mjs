import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function findSpecs(root, scope) {
  const testRoot = path.join(root, "cypress", "tests");
  if (!fs.existsSync(testRoot)) return [];
  const visit = (directory) =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(fullPath);
      // Accept TypeScript specs too. Matching only .cy.js meant a TS suite silently resolved to
      // zero specs and reported "bootstrap state is valid" — a green run that tested nothing.
      if (!/\.cy\.(?:m|c)?[jt]s$/i.test(entry.name)) return [];
      const segments = path.relative(testRoot, fullPath).split(path.sep);
      return scope === "all" || segments.includes(scope) ? [fullPath] : [];
    });
  return visit(testRoot);
}

export function run(
  scope,
  extraArgs = [],
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
) {
  const specs = findSpecs(root, scope);
  if (specs.length === 0) {
    console.log(`[cypress] No ${scope} specs yet; bootstrap state is valid.`);
    return 0;
  }

  const cypressBin = path.join(
    root,
    "node_modules",
    "cypress",
    "bin",
    "cypress",
  );
  const args = [
    cypressBin,
    "run",
    "--spec",
    specs
      .map((file) => path.relative(root, file).split(path.sep).join("/"))
      .join(","),
    ...extraArgs.filter((arg) => arg !== "--"),
  ];
  if (
    process.env.CYPRESS_PROJECT_ID &&
    process.env.CYPRESS_RECORD_KEY &&
    !args.includes("--record")
  ) {
    args.push("--record");
  }
  return (
    spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" }).status ??
    1
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [scope = "all", ...extraArgs] = process.argv.slice(2);
  if (!["all", "smoke", "e2e", "ddt"].includes(scope)) {
    console.error(
      "Usage: node scripts/run-cypress.mjs [all|smoke|e2e|ddt] [Cypress arguments]",
    );
    process.exit(2);
  }
  process.exit(run(scope, extraArgs));
}
