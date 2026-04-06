## Why

Security audit identified gaps in input validation across CLI commands. While credentials and API keys are handled correctly, several commands lack validation for user-provided flags (`--metadata`, `--webhook-url`) and file arguments, leading to unhelpful crash messages or silent overwrites. These must be fixed before release. Closes #10.

## What Changes

- Wrap `JSON.parse()` calls for `--metadata` flag in try/catch with clear error messages
- Validate `--webhook-url` format and restrict to http/https protocols
- Add file existence check before `readFileSync` for source arguments
- Add `--force` flag to `types export -o` to prevent accidental file overwrite (**BREAKING** for scripts that rely on silent overwrite)
- Centralize all validation logic in a new `src/validators.ts` module

## Capabilities

### New Capabilities
- `input-validation`: Centralized validation helpers for JSON flags, URLs, and file sources used across all commands

### Modified Capabilities
- `error-ux-missing-input`: Extends error UX to cover invalid flag values (malformed JSON, bad URLs, missing files) — not just missing arguments

## Impact

- **Commands affected**: `convert`, `identify`, `steps run`, `types export`
- **New file**: `src/validators.ts`
- **No new dependencies** — uses Node.js stdlib (`URL`, `existsSync`, `statSync`)
- **Breaking**: `types export -o` now requires `--force` to overwrite existing files
