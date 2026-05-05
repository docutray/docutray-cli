## ADDED Requirements

### Requirement: API key format validation on login
The CLI SHALL validate API keys received via the positional `api-key` argument or the `--api-key` flag against the DocuTray key format before persisting them to `~/.config/docutray/config.json`. A valid key SHALL start with `dt` followed by 20 or more URL-safe base64 characters (`A-Z`, `a-z`, `0-9`, `_`, `-`). Keys that do not match SHALL be rejected with a clear error and the configuration file SHALL NOT be written.

#### Scenario: Real-format key accepted (dt + 64 base64url chars)
- **WHEN** the user runs `docutray login dtUXtMlrFQTPaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIjKlMnOpQrSt`
- **THEN** the key is written to `~/.config/docutray/config.json`
- **AND** stdout contains the standard login success JSON
- **AND** the process exits with code 0

#### Scenario: Legacy dt_live_… key accepted
- **WHEN** the user runs `docutray login --api-key dt_live_abcDEF0123456789abc`
- **THEN** the key is written to `~/.config/docutray/config.json`
- **AND** the process exits with code 0

#### Scenario: Garbage positional key rejected
- **WHEN** the user runs `docutray login 2`
- **THEN** stderr contains an error indicating the API key format is invalid
- **AND** `~/.config/docutray/config.json` is not modified
- **AND** the process exits with non-zero code

#### Scenario: Wrong prefix rejected
- **WHEN** the user runs `docutray login --api-key sk_live_abcDEF0123456789abc`
- **THEN** stderr contains an error indicating the API key format is invalid
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: Empty string rejected
- **WHEN** the user runs `docutray login ""`
- **THEN** stderr contains an error indicating the API key cannot be empty or has invalid format
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: Too-short key rejected
- **WHEN** the user runs `docutray login dt`
- **THEN** stderr contains an error indicating the API key format is invalid
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: Whitespace is trimmed before validation
- **WHEN** the user runs `docutray login " dt_live_abcDEF0123456789abc "`
- **THEN** the surrounding whitespace is trimmed
- **AND** the key is accepted and written to `~/.config/docutray/config.json`

### Requirement: API key validation helper exposed from validators module
The validation module `src/validators.ts` SHALL export a `validateApiKey(value: string): string` function that returns the trimmed valid key or throws an `Error` with a message starting with `Invalid API key format`. The login command SHALL call this helper before persisting any key obtained from positional argument or `--api-key` flag.

#### Scenario: Helper returns trimmed valid key
- **WHEN** `validateApiKey("  dt_live_abcDEF0123456789abc  ")` is called
- **THEN** the function returns `"dt_live_abcDEF0123456789abc"` (no surrounding whitespace)

#### Scenario: Helper throws on invalid input
- **WHEN** `validateApiKey("garbage")` is called
- **THEN** the function throws an `Error` whose message starts with `Invalid API key format`
