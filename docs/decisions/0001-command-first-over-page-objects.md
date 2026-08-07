# 0001 — Command-First Architecture Over Page Object Model

## Status

Accepted

## Context

The team evaluated two dominant patterns for organizing Cypress test code:

1. **Page Object Model (POM)** — a class per page that encapsulates selectors and methods, instantiated in test files.
2. **Command-First** — atomic `cy.*` commands registered globally, with selectors in frozen config objects, and thin spec files that only orchestrate command calls.

POM is the industry default carried over from Selenium. The team had prior experience with it and needed a clear rationale to adopt something different.

The specific pain points from POM that surfaced during evaluation:

- **Implicit coupling**: page class instances in tests create hidden ownership. When a page is refactored, it's unclear which tests break until they run.
- **Inheritance creep**: teams extend `BasePage` repeatedly, creating fragile hierarchies that diverge across modules.
- **Selector drift**: selectors defined in page classes duplicate over time as new pages "borrow" elements from sibling pages.
- **Spec verbosity**: `loginPage.open(); loginPage.enterUsername(user); loginPage.submit();` reads like imperative prose, not assertions.
- **No single-file ownership enforcement**: nothing prevents two page objects from defining `clickSubmit()` on the same element.

## Decision

Adopt the **Config → Commands → Tests** architecture:

- **Config layer** (`cypress/configs/**`): frozen constants only — selectors, endpoints, routes. No functions, no logic. Update one constant; every command using it updates automatically.
- **Commands layer** (`cypress/support/commands/**`): atomic `cy.*` commands that import from configs. One command name has one owner file. The hook system enforces this.
- **Tests layer** (`cypress/tests/**`): thin spec files that call commands and assert. No selectors, no URLs, no business logic.

Commands map to the GoF Command Pattern: each is a named, self-contained unit of behavior. The global `cy.*` namespace is the interface; the command file is the implementation. Single-file ownership is enforced by hooks in `.claude/hooks/`.

## Consequences

**Easier:**

- Selector changes: update one constant in `configs/ui/`, all tests update automatically.
- Flow changes: fix one command, not every test that calls it.
- Onboarding: new engineers write tests by calling `cy.*` commands — no class instantiation, no inheritance to understand.
- Duplication detection: the duplication-guard prompt hook and post-write hooks catch redundant selectors and commands before they merge.
- AI-assisted authoring: LLMs generate command-first code reliably because the pattern is uniform — no inheritance trees to navigate.

**Harder:**

- Teams coming from POM need a mental shift: commands are not methods on an object, and there is no object to hold state between calls.
- The global `cy.*` namespace requires disciplined naming. Conflicts are caught by hooks but prevented by convention (`cy.visitPayments()` not `cy.visit()`).
- IDE autocomplete for custom `cy.*` commands requires TypeScript declarations or JSDoc — not generated automatically.

See [docs/reference/test-organization.md](../reference/test-organization.md#part-5--the-pom-question-for-teams-coming-from-page-objects) for the full comparison and migration guide.
