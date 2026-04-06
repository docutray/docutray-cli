## Purpose

Improved error UX when required arguments or flags are missing. Shows error alongside command help in TTY mode, structured JSON in pipe mode. Implemented via `BaseCommand` class.

## Requirements

### Requirement: Missing argument shows help in TTY
When a required argument is omitted and stderr is a TTY, the CLI SHALL display the error message followed by the full command help on stderr, then exit with code 1.

#### Scenario: Missing required arg in TTY
- **WHEN** user runs `docutray convert` without the required `source` argument and stderr is a TTY
- **THEN** stderr shows the error icon and message (e.g., "Error: Missing 1 required arg: source") followed by the command's usage/help output
- **THEN** the process exits with code 1

#### Scenario: Missing required flag in TTY
- **WHEN** user runs `docutray convert invoice.pdf` without the required `--type` flag and stderr is a TTY
- **THEN** stderr shows the error icon and message (e.g., "Error: Missing required flag: --type") followed by the command's usage/help output
- **THEN** the process exits with code 1

### Requirement: Missing argument outputs JSON in pipe mode
When a required argument is omitted and stderr is NOT a TTY, the CLI SHALL output a JSON error object to stderr, then exit with code 1.

#### Scenario: Missing required arg in pipe mode
- **WHEN** user runs `docutray types get` without the required `code` argument and stderr is not a TTY
- **THEN** stderr receives a JSON object with an `"error"` field containing the missing arg message
- **THEN** the process exits with code 1

### Requirement: SDK errors are unaffected
Errors from the SDK/API (not oclif parse errors) and input validation errors (malformed JSON, invalid URLs, missing files) SHALL continue to be handled by the command's own error path via `outputError()`.

#### Scenario: API error still uses outputError
- **WHEN** a command's SDK call throws an error (e.g., "Step not found")
- **THEN** the error is handled by the command's try/catch and output via `outputError()` (not by BaseCommand.catch)
- **THEN** no command help is shown alongside the error

#### Scenario: Validation error uses outputError
- **WHEN** a validator function throws an error (e.g., "Invalid JSON in --metadata")
- **THEN** the error is caught by the command's try/catch and output via `outputError()`
- **THEN** no command help is shown alongside the error

### Requirement: All commands use BaseCommand
All CLI commands (except help) SHALL extend `BaseCommand` instead of oclif's `Command` class directly.

#### Scenario: Command extends BaseCommand
- **WHEN** any command file in `src/commands/` is inspected
- **THEN** it imports and extends `BaseCommand` from `src/base-command.ts`
