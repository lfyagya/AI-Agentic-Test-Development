# Test Organization

## Direction

```text
Config → Commands → Tests
```

Dependencies move only to the right:

- `cypress/configs/**` owns selectors, routes, endpoints, and constants.
- `cypress/support/commands/**` owns reusable behavior and assertions.
- `cypress/tests/**` owns thin Arrange–Act–Assert orchestration.

## Module layout

```text
cypress/
  configs/
    app/routes.js
    api/modules/<module>/<module>.api.js
    ui/modules/<module>/<module>.ui.js
  support/
    commands/modules/<module>.commands.js
  tests/
    <module>/
      smoke/<module>-smoke.cy.js
      e2e/<module>-e2e.cy.js
      ddt/<module>-ddt.cy.js
```

Create these files only after the matching module context and active requirement exist.

## Ownership rules

- Search values before adding an owner.
- Shared code must be genuinely shared by multiple modules.
- Module commands do not import another module’s private config.
- Tests never duplicate command logic.
- Smoke is minimal, P0-first, and read-only.
- E2E/DDT data is synthetic, isolated, and cleaned after failure.

## Traceability

Every title starts with `[REQUIREMENT-ID]`. The same id appears as a tag alongside exactly one Type,
Priority, and tier tag. This provides both reliable reporter evidence and focused execution.

See [`../START-HERE.md`](../START-HERE.md) for the complete build and review workflow.
