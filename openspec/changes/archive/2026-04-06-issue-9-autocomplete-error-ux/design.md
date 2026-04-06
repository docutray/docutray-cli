## Context

All 10 CLI commands extend oclif's `Command` class directly. Each command has its own try/catch that swallows all errors (including oclif parse validation errors) and outputs them via `outputError()`. This means missing arg/flag errors produce a terse message without usage context. There is no shell autocomplete support.

The CLI already has a dual-output system (TTY-aware human output vs JSON for pipes) established in issue #8.

## Goals / Non-Goals

**Goals:**
- Shell autocomplete for bash, zsh, and fish via oclif's official plugin
- Show command help alongside missing arg/flag errors in TTY mode
- Maintain JSON error output in pipe mode for missing arg/flag errors
- Centralize error handling in a `BaseCommand` class to reduce duplication

**Non-Goals:**
- Custom autocomplete logic beyond what `@oclif/plugin-autocomplete` provides
- Autocomplete for dynamic values (e.g., document type codes from the API)
- Changes to SDK/API error handling — only oclif parse errors are affected
- Interactive error recovery or prompting for missing arguments

## Decisions

### 1. Use `@oclif/plugin-autocomplete` for shell completion

**Decision**: Install the official oclif autocomplete plugin rather than building custom completion scripts.

**Rationale**: The plugin auto-generates completions from command/arg/flag definitions. Zero per-command configuration needed. Maintained by the oclif team.

**Alternative considered**: Hand-written completion scripts — rejected due to maintenance burden and duplicated knowledge of command structure.

### 2. Abstract `BaseCommand` class with `catch()` override

**Decision**: Create `src/base-command.ts` with an abstract class that overrides oclif's `catch()` lifecycle method to intercept missing arg/flag errors.

**Rationale**: oclif calls `catch()` when `run()` throws. By moving `this.parse()` outside the command's try/catch, parse validation errors naturally propagate to `BaseCommand.catch()`. This centralizes error UX in one place.

**Alternative considered**: Checking error type inside each command's catch block — rejected because it duplicates logic across 10 files.

### 3. Move `this.parse()` outside commands' try/catch

**Decision**: Restructure command `run()` methods so `this.parse()` and `setForceJson()` execute before the try block. Only SDK/business-logic errors are caught inside try/catch.

**Rationale**: This allows oclif parse errors (CLIError) to escape to `BaseCommand.catch()`, while SDK errors continue to be handled by the command's own error path via `outputError()`.

### 4. TTY-aware error display

**Decision**: In TTY mode, show `Error: <message>` followed by the full command help. In pipe mode, output the error as JSON to stderr (consistent with issue #8's dual-output pattern).

**Rationale**: TTY users benefit from seeing the correct usage immediately. Pipe consumers need structured JSON for programmatic handling.

## Risks / Trade-offs

- **[Risk] Parse errors bypass `setForceJson()`** — If `this.parse()` fails, `setForceJson(flags.json)` hasn't run. Mitigation: `isStderrInteractive()` falls back to TTY detection (`process.stderr.isTTY`), which is correct for the vast majority of cases.
- **[Risk] `@oclif/plugin-autocomplete` adds a visible `autocomplete` command** — Users see an extra top-level command. Mitigation: This is standard practice for CLIs (gh, heroku, vercel all do this).
- **[Trade-off] All commands must extend `BaseCommand`** — Adds a level of indirection. Accepted because it eliminates duplicated error handling and provides a natural extension point for future cross-cutting concerns.
