## Context

The CLI accepts user-provided flags (`--metadata`, `--webhook-url`) and file arguments that are passed directly to the SDK without validation. This causes cryptic crashes (e.g., `SyntaxError: Unexpected end of JSON input`) instead of actionable error messages. The `types export -o` command silently overwrites existing files.

All validation gaps are in the command layer (`src/commands/`), between flag parsing and SDK calls. The SDK itself does not validate these inputs client-side.

## Goals / Non-Goals

**Goals:**
- Provide clear, actionable error messages for all invalid user inputs
- Centralize validation logic to avoid duplication across commands
- Prevent accidental file overwrite in `types export`
- Maintain consistent error output format (TTY human-readable, pipe JSON)

**Non-Goals:**
- Rewriting the error handling architecture (BaseCommand.catch is fine)
- Adding validation for SDK/API-level errors (those are already handled)
- Input sanitization beyond format validation (no path traversal checks — the SDK handles file upload)
- Adding interactive confirmation prompts (CLI is non-interactive by design)

## Decisions

### 1. Centralized `src/validators.ts` module

All validation functions in a single module with pure functions that throw `Error` on invalid input. Commands call validators before constructing SDK params.

**Alternative considered**: Oclif custom flag parsers — rejected because oclif's parse errors trigger `BaseCommand.catch` which shows help text, but these are value-format errors, not missing-argument errors. They should go through the command's own try/catch → `outputError()` path.

### 2. Validators throw plain `Error` objects

Validators throw `new Error(message)` which gets caught by each command's existing `catch (error) { outputError(error) }` block. This preserves the current TTY/JSON error output behavior without any changes to `output.ts`.

**Alternative considered**: Return `Result<T, E>` types — over-engineered for a CLI with simple validation needs.

### 3. `--force` flag on `types export` (opt-in overwrite)

Default behavior changes to refuse overwriting. Users pass `--force` to confirm. This is a minor breaking change acceptable in v0.1.x.

**Alternative considered**: Interactive confirmation prompt — rejected because CLI is designed for non-interactive use by AI agents.

### 4. Source validation checks file existence before `readFileSync`

`validateSource()` checks `existsSync` + `statSync` for local paths and returns `{isUrl: boolean}` so commands can branch on file vs URL. URL sources skip file validation (the SDK handles URL fetching).

## Risks / Trade-offs

- **Breaking change in `types export -o`** → Acceptable in pre-1.0. Mitigated by clear error message suggesting `--force`.
- **TOCTOU race in file existence check** → Negligible risk for a CLI tool. The check is a UX improvement, not a security boundary. The `readFileSync` call will still fail gracefully if the file disappears between check and read.
- **Validation duplicates SDK-side checks** → Intentional. CLI-side validation provides immediate, clear feedback before network calls. SDK errors are still caught as fallback.
