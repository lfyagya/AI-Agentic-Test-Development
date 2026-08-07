# TypeScript

TypeScript is **opt-in per file**. The framework layer stays JavaScript; you can write a new spec,
command, or config in `.ts` without converting anything. Both languages compile in one program.

Three of seven Cypress-adapter projects report TypeScript, so this exists to serve them without
forcing a conversion on the teams that are happy in JavaScript.

## Writing a TypeScript spec

Name it `*.cy.ts` under `cypress/tests/**`. Nothing else changes — the same rules apply, the same
agents build it, the same gate grades it.

```bash
npm run typecheck
```

`tsc --noEmit` type-checks the repo. It runs inside `npm run verify`, so a type error fails the gate
chain the same way a lint error does.

## Custom command types

`cypress/support/index.d.ts` declares every `cy.*` command this repo adds — `ensureAuthenticated`,
`apiWait`, `getByTestId`, and the rest. Without it, a TypeScript spec sees none of them and the usual
"fix" is a cast or a `ts-ignore` that throws away the checking TypeScript was adopted for.

**Add a command, add its declaration in the same change.** A command without a type is invisible to
every TypeScript spec.

Editors read this file for `.cy.js` too, so JavaScript specs get the same IntelliSense.

## Enforcement applies equally

This is worth stating plainly, because it was once false. Every rule matches `.js`, `.ts`, `.mjs`,
`.mts`, `.cjs`, and `.cts` identically:

- Write-time hooks refuse a violating `.cy.ts` exactly as they refuse a `.cy.js`.
- `npm run check:rules` scans both.
- `scripts/harness/test-rule-extensions.mjs` asserts the same violating spec produces the **same
  number of findings** in all six extensions, and fails if a pattern is ever narrowed back.

Before that guard existed, a `.cy.ts` spec with five block-severity violations produced zero
findings: TypeScript looked like it worked while silently disabling the entire guardrail. That is a
worse failure than no TypeScript support at all, because nothing warned anyone.

## What is deliberately not done

- **`checkJs` is off.** Turning it on would open with hundreds of errors in `.js` code nobody is
  changing. Opt in per file with `// @ts-check` when you are ready.
- **`strict` is on.** A suite that permits `any` gives up the checking it was adopted for.
- **No mass conversion.** The framework layer is JavaScript and works. Converting it is churn with no
  behavioural gain; the rules and the gate do not care which language a file is in.

## Full conversion, if you want it

Not required, and not recommended before a project is stable. If you do:

1. Rename `cypress/support/**` and `cypress/configs/**` to `.ts` a folder at a time — `allowJs` means
   a half-converted tree still compiles.
2. Turn on `checkJs` only once the remaining `.js` count is small.
3. Leave `cypress.config.js` and `cypress/webpack.config.js` as CommonJS `.js`; Cypress loads them
   before any transform is available.
4. Keep `index.d.ts` until every command is declared in real `.ts` source, then delete it.
