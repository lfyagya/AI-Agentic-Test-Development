/**
 * Shared Cypress rule scanner used by both pre-validate and post-validate hooks.
 * Add new rules here — they apply to both the pre-write block and the post-write warning.
 */

import fs from "node:fs";
import path from "node:path";

const TARGET_FILE_RE = /cypress[\\/].*\.(cy\.js|commands\.js|js)$/i;

export function toPosix(p) {
  return p.replaceAll("\\", "/");
}

export function extractToolChange(
  toolData,
  repoRoot,
  { readCurrent = false } = {},
) {
  const toolName = toolData?.tool_name || toolData?.toolName || "";
  let toolInput = toolData?.tool_input || toolData?.toolArgs || {};
  if (typeof toolInput === "string") {
    try {
      toolInput = JSON.parse(toolInput);
    } catch {
      return { filePath: "", content: "" };
    }
  }

  const filePath =
    toolInput.file_path || toolInput.filePath || toolInput.path || "";
  if (!filePath || !["Write", "Edit"].includes(toolName))
    return { filePath: "", content: "" };

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(repoRoot, filePath);
  if (readCurrent && fs.existsSync(absolutePath)) {
    return { filePath, content: fs.readFileSync(absolutePath, "utf8") };
  }

  if (toolName === "Write") {
    return { filePath, content: toolInput.content || toolInput.text || "" };
  }

  const replacement =
    toolInput.new_string ||
    toolInput.newString ||
    toolInput.new_str ||
    toolInput.replacement ||
    toolInput.content ||
    "";
  const original =
    toolInput.old_string || toolInput.oldString || toolInput.old_str || "";
  if (replacement && original && fs.existsSync(absolutePath)) {
    const current = fs.readFileSync(absolutePath, "utf8");
    if (current.includes(original)) {
      return { filePath, content: current.replace(original, replacement) };
    }
  }
  return { filePath, content: replacement };
}

export function loadAllowlist(allowlistPath) {
  try {
    const raw = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    return {
      selectors: new Set((raw.selectors || []).map((s) => String(s).trim())),
      routes: new Set((raw.routes || []).map((s) => String(s).trim())),
      endpoints: new Set((raw.endpoints || []).map((s) => String(s).trim())),
    };
  } catch {
    return {
      selectors: new Set(["body", "html"]),
      routes: new Set(["/"]),
      endpoints: new Set(),
    };
  }
}

export function loadRuleMessages(repoRoot) {
  try {
    return Object.fromEntries(
      JSON.parse(
        fs.readFileSync(path.join(repoRoot, "harness.config.json"), "utf8"),
      ).rules.map((rule) => [rule.id, rule.message]),
    );
  } catch {
    return {};
  }
}

export function isAllowedLiteral(value, allowSet, ignoreCase = false) {
  const literal = String(value || "").trim();
  if (!literal) return false;
  if (allowSet.has(literal)) return true;
  if (!ignoreCase) return false;
  const lower = literal.toLowerCase();
  for (const allowed of allowSet) {
    if (String(allowed).toLowerCase() === lower) return true;
  }
  return false;
}

export function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function scanForRegex(
  violations,
  filePath,
  text,
  regex,
  messageBuilder,
) {
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lineNumber = lineNumberForIndex(text, match.index);
    const message =
      typeof messageBuilder === "function"
        ? messageBuilder(match)
        : messageBuilder;
    if (!message) continue;
    violations.push({ filePath, lineNumber, message });
  }
}

export function scanContent(filePath, content, allowlist, repoRoot) {
  const violations = [];
  const messages = loadRuleMessages(repoRoot);
  const message = (id, fallback) => messages[id] || fallback;
  // The tool may hand us a repo-relative path. Node would resolve that against cwd, which is
  // not necessarily the repo root — from a foreign cwd that yields a mangled path, and the
  // file-type regex below can miss it, silently skipping every rule. Anchor to repoRoot.
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(repoRoot, filePath);
  const normalized = toPosix(path.relative(repoRoot, absolute));

  if (!TARGET_FILE_RE.test(normalized)) return violations;

  // Rule 1: No hard waits.
  scanForRegex(
    violations,
    normalized,
    content,
    /\bcy\.wait\(\s*\d+\s*\)/g,
    message(
      "no-hard-wait",
      "Hard wait detected. Replace with cy.apiWait(...) or a deterministic state-based wait.",
    ),
  );

  // Rule 2: No action classes or page-object wrappers.
  if (
    /\.actions\.js$/i.test(normalized) ||
    /(^|\/)(page-objects?|pageobjects?)(\/|$)/i.test(normalized) ||
    /\bclass\s+\w*(?:Page|Actions)\b/.test(content)
  ) {
    violations.push({
      filePath: normalized,
      lineNumber: 1,
      message: message(
        "no-page-object",
        "Action class or page-object wrapper detected. Use command-first architecture.",
      ),
    });
  }
  scanForRegex(
    violations,
    normalized,
    content,
    /from\s+['"][^'"]*\.actions\.js['"]/g,
    message(
      "no-page-object",
      "Action class import detected. Command-first architecture forbids *.actions.js dependencies.",
    ),
  );
  scanForRegex(
    violations,
    normalized,
    content,
    /from\s+['"][^'"]*(page-obj|pageobject|page-object)[^'"]*['"]/gi,
    message(
      "no-page-object",
      "Page-object import detected. Command-first architecture forbids page-object dependencies.",
    ),
  );

  // Rule 3: No hardcoded selectors in spec/command files.
  if (/\.(cy\.js|commands\.js)$/i.test(normalized)) {
    scanForRegex(
      violations,
      normalized,
      content,
      /\bcy\.(get|find)\(\s*['"](?!@)([^'"]+)['"]\s*\)/g,
      (m) => {
        const selector = String(m[2] || "").trim();
        if (isAllowedLiteral(selector, allowlist.selectors, true)) return null;
        return message(
          "no-hardcoded-selector",
          `Hardcoded selector in cy.${m[1]}('${selector}'). Use config constants from cypress/configs/ui/**.`,
        );
      },
    );
  }

  // Rule 4: No hardcoded routes in cy.visit (except allowlisted root).
  if (/\.(cy\.js|commands\.js)$/i.test(normalized)) {
    scanForRegex(
      violations,
      normalized,
      content,
      /\bcy\.visit\(\s*['"]([^'"]+)['"]\s*\)/g,
      (m) => {
        const route = String(m[1] || "").trim();
        const isLiteral = route.startsWith("/") || /^https?:\/\//i.test(route);
        if (!isLiteral || isAllowedLiteral(route, allowlist.routes))
          return null;
        return message(
          "no-hardcoded-route",
          `Hardcoded route '${route}' in cy.visit(...). Use route constants from cypress/configs/app/routes.js.`,
        );
      },
    );
  }

  // Rule 5: Auth-required specs must call cy.ensureAuthenticated().
  // Bypass with pragma: // @no-ensureAuthenticated (for modules with their own auth command)
  if (/cypress[\\/]tests[\\/].*\.cy\.js$/i.test(normalized)) {
    const requiresAuth = !/unauth|public|health/i.test(normalized);
    const hasPragma = /\/\/\s*@no-ensureAuthenticated/.test(content);
    if (
      requiresAuth &&
      !hasPragma &&
      !/cy\.ensureAuthenticated\(/.test(content)
    ) {
      violations.push({
        filePath: normalized,
        lineNumber: 1,
        message: message(
          "require-auth-command",
          "Missing cy.ensureAuthenticated() in auth-required test file.",
        ),
      });
    }
  }

  // Rule 6: No credentials in source. Trust boundary — never relaxed.
  // Values starting with $ are skipped so environment-variable interpolation passes.
  scanForRegex(
    violations,
    normalized,
    content,
    /\b(password|passwd|secret|api[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*["'`]([^"'`$][^"'`]{3,})["'`]/gi,
    (m) =>
      message(
        "no-credential-literal",
        `Hardcoded credential assigned to '${m[1]}'. Read it with cy.env([...]) instead; keep the value in cypress.env.json (gitignored) or a CI secret.`,
      ),
  );

  // Rule 7: Smoke tests must be read-only.
  if (/cypress[\\/]tests[\\/].*[\\/]smoke[\\/].*\.cy\.js$/i.test(normalized)) {
    scanForRegex(
      violations,
      normalized,
      content,
      /\bcy\.request\(\s*['"](POST|PUT|PATCH|DELETE)['"]/gi,
      message(
        "smoke-read-only",
        "Write request in smoke suite. Smoke tests must remain read-only.",
      ),
    );
    scanForRegex(
      violations,
      normalized,
      content,
      /\bmethod\s*:\s*['"](POST|PUT|PATCH|DELETE)['"]/gi,
      message(
        "smoke-read-only",
        "Write HTTP method in smoke suite. Smoke tests must remain read-only.",
      ),
    );
  }

  return violations;
}
