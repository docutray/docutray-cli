## MODIFIED Requirements

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
