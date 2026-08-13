/**
 * Shared Cypress rule scanner used by both pre-validate and post-validate hooks.
 * Add new rules here — they apply to both the pre-write block and the post-write warning.
 */

import fs from "node:fs";
import path from "node:path";

// Every rule matches on extension, so the extension list lives here once. A TypeScript spec that
// slips past this list silently loses every block-severity rule — identical code, zero violations —
// which is worse than TypeScript being unsupported, because it looks like it works.
const SCRIPT_EXT = String.raw`(?:m|c)?[jt]s`; // js, mjs, cjs, ts, mts, cts
const SPEC_RE = new RegExp(String.raw`\.cy\.${SCRIPT_EXT}$`, "i");
const COMMANDS_RE = new RegExp(String.raw`\.commands\.${SCRIPT_EXT}$`, "i");
const ACTIONS_RE = new RegExp(String.raw`\.actions\.${SCRIPT_EXT}$`, "i");
const SPEC_OR_COMMANDS_RE = new RegExp(
  String.raw`\.(?:cy|commands)\.${SCRIPT_EXT}$`,
  "i",
);
const TESTS_SPEC_RE = new RegExp(
  String.raw`cypress[\\/]tests[\\/].*\.cy\.${SCRIPT_EXT}$`,
  "i",
);
const SMOKE_SPEC_RE = new RegExp(
  String.raw`cypress[\\/]tests[\\/].*[\\/]smoke[\\/].*\.cy\.${SCRIPT_EXT}$`,
  "i",
);
const TARGET_FILE_RE = new RegExp(
  String.raw`cypress[\\/].*\.${SCRIPT_EXT}$`,
  "i",
);

export const EXTENSION_PATTERNS = {
  SCRIPT_EXT,
  SPEC_RE,
  COMMANDS_RE,
  ACTIONS_RE,
  SPEC_OR_COMMANDS_RE,
  TESTS_SPEC_RE,
  SMOKE_SPEC_RE,
  TARGET_FILE_RE,
};

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
  // Claude/Copilot: Write|Edit. Cursor: Write|StrReplace (and Edit aliases).
  const writeTools = new Set(["Write", "Edit", "StrReplace"]);
  if (!filePath || !writeTools.has(toolName))
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

/**
 * Returns one balanced object literal beginning at `start`.
 *
 * Test options can contain nested objects (`retries: { runMode: 1 }`). A non-greedy regex stops at
 * the first closing brace and can miss a later `tags` field, turning valid tests into false
 * positives. This scanner tracks nested braces and quoted strings instead.
 */
export function extractBalancedObject(text, start) {
  if (text[start] !== "{") return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return "";
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
    ACTIONS_RE.test(normalized) ||
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
    new RegExp(String.raw`from\s+['"][^'"]*\.actions\.${SCRIPT_EXT}['"]`, "g"),
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
  if (SPEC_OR_COMMANDS_RE.test(normalized)) {
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
  if (SPEC_OR_COMMANDS_RE.test(normalized)) {
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
  if (TESTS_SPEC_RE.test(normalized)) {
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

  // Rule 8: Exactly one requirement tag per test, plus one Type and one Priority tag, with the
  // title requirement id matching the requirement tag. This is a structural, single-file check —
  // whether the id is *active* and unique across the repository is graded by evidence:build and
  // check:requirements, which can see cross-file and cross-branch state a write-time hook cannot.
  if (TESTS_SPEC_RE.test(normalized)) {
    const tagMessage = message(
      "one-requirement-tag",
      "Spec must carry exactly one known requirement id in its title and tags.",
    );
    // Requirement id shape, e.g. AE-PRODUCTS-001 or REQ-1: uppercase segments joined by hyphens.
    const REQUIREMENT_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
    const TYPE_TAGS = new Set(["smoke", "regression"]);
    const PRIORITY_TAGS = new Set(["P0", "P1", "P2"]);
    // Capture each test title, then parse an optional balanced options object after it.
    const testCallRe = /\b(?:it|specify)(?:\.\w+)?\s*\(\s*(['"`])([\s\S]*?)\1/g;
    let testMatch;
    while ((testMatch = testCallRe.exec(content)) !== null) {
      const lineNumber = lineNumberForIndex(content, testMatch.index);
      const title = String(testMatch[2] || "");
      let cursor = testCallRe.lastIndex;
      while (/\s/.test(content[cursor] || "")) cursor += 1;
      if (content[cursor] === ",") cursor += 1;
      while (/\s/.test(content[cursor] || "")) cursor += 1;
      const optionsObject = extractBalancedObject(content, cursor);
      const titleIdMatch = title.match(/^\s*\[([^\]]+)\]/);
      const titleId = titleIdMatch ? titleIdMatch[1].trim() : null;

      const tagsArrayMatch = optionsObject.match(/tags\s*:\s*\[([^\]]*)\]/);
      const tags = tagsArrayMatch
        ? [...tagsArrayMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) =>
            m[1].trim(),
          )
        : [];
      const bare = (tag) => tag.replace(/^@/, "");
      const typeTags = tags.filter((tag) =>
        TYPE_TAGS.has(bare(tag).toLowerCase()),
      );
      const priorityTags = tags.filter((tag) =>
        PRIORITY_TAGS.has(bare(tag).toUpperCase()),
      );
      const requirementTags = tags.filter(
        (tag) =>
          !TYPE_TAGS.has(bare(tag).toLowerCase()) &&
          !PRIORITY_TAGS.has(bare(tag).toUpperCase()) &&
          REQUIREMENT_ID.test(bare(tag)),
      );
      const pathTier = ["smoke", "e2e", "ddt"].find((tier) =>
        normalized.split("/").includes(tier),
      );
      const tierTags = pathTier
        ? tags.filter((tag) => bare(tag).toLowerCase() === pathTier)
        : [];

      const problems = [];
      if (!titleId || !REQUIREMENT_ID.test(titleId)) {
        problems.push("title must begin with a [REQUIREMENT-ID] prefix");
      }
      if (requirementTags.length !== 1) {
        problems.push(
          `expected exactly one requirement id tag, found ${requirementTags.length}`,
        );
      }
      if (typeTags.length !== 1) {
        problems.push(
          `expected exactly one Type tag (@smoke or @regression), found ${typeTags.length}`,
        );
      }
      if (priorityTags.length !== 1) {
        problems.push(
          `expected exactly one Priority tag (@P0/@P1/@P2), found ${priorityTags.length}`,
        );
      }
      if (pathTier && tierTags.length !== 1) {
        problems.push(
          `expected exactly one tier tag (@${pathTier}) for the ${pathTier} path, found ${tierTags.length}`,
        );
      }
      if (
        titleId &&
        requirementTags.length === 1 &&
        bare(requirementTags[0]) !== titleId
      ) {
        problems.push(
          `title id [${titleId}] does not match requirement tag ${requirementTags[0]}`,
        );
      }
      if (problems.length > 0) {
        violations.push({
          filePath: normalized,
          lineNumber,
          message: `${tagMessage} (${problems.join("; ")})`,
        });
      }
    }
  }

  // Rule 7: Smoke tests must be read-only.
  if (SMOKE_SPEC_RE.test(normalized)) {
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
