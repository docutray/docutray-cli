## ADDED Requirements

### Requirement: JSON flag validation
The CLI SHALL validate `--metadata` flag values as valid JSON before passing them to the SDK. If the value is not valid JSON, the CLI SHALL display a clear error message including the flag name and the invalid value.

#### Scenario: Valid JSON metadata accepted
- **WHEN** user runs `docutray convert file.pdf -t inv --metadata '{"ref":"123"}'`
- **THEN** the metadata is parsed and passed to the SDK as an object

#### Scenario: Malformed JSON metadata rejected
- **WHEN** user runs `docutray convert file.pdf -t inv --metadata '{"bad'`
- **THEN** stderr shows error "Invalid JSON in --metadata: {\"bad"
- **THEN** the process exits with code 1

#### Scenario: Malformed JSON metadata in steps run
- **WHEN** user runs `docutray steps run step-id file.pdf --metadata 'not-json'`
- **THEN** stderr shows error "Invalid JSON in --metadata: not-json"
- **THEN** the process exits with code 1

### Requirement: Webhook URL validation
The CLI SHALL validate `--webhook-url` flag values as valid HTTP or HTTPS URLs. Invalid URLs or non-HTTP protocols SHALL be rejected with a clear error message.

#### Scenario: Valid HTTPS webhook URL accepted
- **WHEN** user runs `docutray convert file.pdf -t inv --webhook-url https://example.com/hook`
- **THEN** the URL is passed to the SDK

#### Scenario: Invalid URL format rejected
- **WHEN** user runs `docutray convert file.pdf -t inv --webhook-url not-a-url`
- **THEN** stderr shows error "Invalid URL in --webhook-url: not-a-url"
- **THEN** the process exits with code 1

#### Scenario: Non-HTTP protocol rejected
- **WHEN** user runs `docutray convert file.pdf -t inv --webhook-url ftp://example.com/hook`
- **THEN** stderr shows error "--webhook-url must use http or https protocol"
- **THEN** the process exits with code 1

### Requirement: Source file existence validation
The CLI SHALL check that source file arguments exist on the filesystem before attempting to read them. URL sources (http/https) SHALL skip this check.

#### Scenario: Nonexistent file rejected
- **WHEN** user runs `docutray convert nonexistent.pdf -t inv`
- **THEN** stderr shows error "File not found: nonexistent.pdf"
- **THEN** the process exits with code 1

#### Scenario: Directory instead of file rejected
- **WHEN** user runs `docutray convert ./some-directory -t inv`
- **THEN** stderr shows error "Expected a file, got a directory: ./some-directory"
- **THEN** the process exits with code 1

#### Scenario: URL source skips file check
- **WHEN** user runs `docutray convert https://example.com/doc.pdf -t inv`
- **THEN** no file existence check is performed and the URL is passed to the SDK

#### Scenario: Source validation in identify command
- **WHEN** user runs `docutray identify nonexistent.pdf`
- **THEN** stderr shows error "File not found: nonexistent.pdf"

#### Scenario: Source validation in steps run command
- **WHEN** user runs `docutray steps run step-id nonexistent.pdf`
- **THEN** stderr shows error "File not found: nonexistent.pdf"

### Requirement: File overwrite protection in types export
The `types export -o` command SHALL refuse to overwrite an existing file unless the `--force` flag is provided.

#### Scenario: Existing file without --force rejected
- **WHEN** user runs `docutray types export code -o existing-file.json` and `existing-file.json` exists
- **THEN** stderr shows error "File already exists: existing-file.json. Use --force to overwrite."
- **THEN** the process exits with code 1

#### Scenario: Existing file with --force succeeds
- **WHEN** user runs `docutray types export code -o existing-file.json --force` and `existing-file.json` exists
- **THEN** the file is overwritten with the exported data

#### Scenario: New file without --force succeeds
- **WHEN** user runs `docutray types export code -o new-file.json` and `new-file.json` does not exist
- **THEN** the file is created with the exported data

### Requirement: Centralized validation module
All input validation functions SHALL be defined in `src/validators.ts` and reused across commands. Commands SHALL NOT implement inline validation logic.

#### Scenario: Validators module exports all helpers
- **WHEN** `src/validators.ts` is inspected
- **THEN** it exports `parseJsonFlag`, `validateUrl`, and `validateSource` functions
