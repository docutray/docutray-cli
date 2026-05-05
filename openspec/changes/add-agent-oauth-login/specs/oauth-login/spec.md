## ADDED Requirements

### Requirement: Non-interactive OAuth login flag
The CLI SHALL provide a `--oauth` flag on `docutray login` that initiates OAuth login regardless of whether stdin or stderr is a TTY. The flag SHALL skip the interactive menu, generate a PKCE pair, start a localhost callback HTTP listener, print the authorization URL to stderr, attempt to open the user's default browser (unless `--no-browser` is set), wait for the OAuth callback, exchange the code for an API key, and persist the API key to `~/.config/docutray/config.json`.

#### Scenario: OAuth login from a non-TTY shell succeeds
- **WHEN** an agent runs `docutray login --oauth` with stdin and stderr piped (non-TTY)
- **AND** the user authorizes in the browser
- **THEN** stderr contains a line beginning with `Open this URL to authorize:` followed by the authorization URL
- **AND** stdout contains a single JSON object with shape `{"message": "Login successful", "apiKey": "<masked>", "organizationId": "...", "organizationName": "...", "configPath": "<path>"}`
- **AND** `~/.config/docutray/config.json` contains the unmasked API key
- **AND** the process exits with code 0

#### Scenario: OAuth login from a TTY behaves the same
- **WHEN** the user runs `docutray login --oauth` from an interactive terminal
- **THEN** the interactive "do you have an API key?" prompt is NOT shown
- **AND** the OAuth flow runs exactly as in the non-TTY case

#### Scenario: --oauth combined with --api-key is rejected
- **WHEN** the user runs `docutray login --oauth --api-key dt_live_abc123`
- **THEN** stderr shows an error indicating that `--oauth` cannot be combined with an api-key argument or `--api-key` flag
- **AND** the process exits with non-zero code
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: --oauth combined with positional api-key is rejected
- **WHEN** the user runs `docutray login --oauth dt_live_abc123`
- **THEN** stderr shows an error indicating that `--oauth` cannot be combined with an api-key argument or `--api-key` flag
- **AND** the process exits with non-zero code

### Requirement: Browser auto-open with opt-out
The CLI SHALL attempt to open the OAuth authorization URL in the user's default browser by default when `--oauth` is used. The CLI SHALL provide a `--no-browser` flag that suppresses the browser-open attempt. Whether or not the browser is opened, the URL SHALL be printed to stderr on its own line so an agent or user can open it manually.

#### Scenario: Browser opens by default
- **WHEN** the user runs `docutray login --oauth`
- **THEN** the platform's default browser-open mechanism is invoked with the authorization URL
- **AND** the URL is also printed to stderr prefixed with `Open this URL to authorize:`

#### Scenario: --no-browser skips the open call
- **WHEN** the user runs `docutray login --oauth --no-browser`
- **THEN** no browser-open call is attempted
- **AND** the URL is still printed to stderr prefixed with `Open this URL to authorize:`

#### Scenario: Browser-open failure does not fail the flow
- **WHEN** the platform browser-open call throws or returns an error
- **THEN** the CLI continues to wait for the callback
- **AND** the URL remains printed on stderr for the user to open manually

### Requirement: Configurable OAuth timeout
The CLI SHALL accept a `--timeout <seconds>` flag on `docutray login --oauth` that controls how long the CLI waits for the OAuth callback. The default SHALL be 180 seconds. On timeout, the CLI SHALL exit non-zero with a clear error and SHALL NOT modify `~/.config/docutray/config.json`.

#### Scenario: Default timeout is 180 seconds
- **WHEN** the user runs `docutray login --oauth` without specifying `--timeout`
- **THEN** the CLI waits up to 180 seconds for the callback before timing out

#### Scenario: Custom timeout is honored
- **WHEN** the user runs `docutray login --oauth --timeout 5` and no browser action occurs
- **THEN** the CLI exits non-zero within approximately 5 seconds (plus minimal overhead)
- **AND** stderr contains an error indicating the OAuth flow timed out
- **AND** `~/.config/docutray/config.json` is not modified

### Requirement: Stdout discipline on the OAuth path
The CLI SHALL NOT write any non-JSON content to stdout during `docutray login --oauth`. All status messages, the authorization URL, and human-readable errors SHALL be written to stderr. The only stdout output on success SHALL be a single JSON object matching the existing login success payload shape.

#### Scenario: Stdout is JSON-parseable on success
- **WHEN** the user runs `docutray login --oauth` and the flow succeeds
- **THEN** the entire stdout content is a single JSON object that parses without error
- **AND** the URL line, "Waiting for authentication" line, and any progress messages appear only on stderr

#### Scenario: Stdout is empty on error
- **WHEN** the user runs `docutray login --oauth --timeout 1` and the flow times out
- **THEN** stdout is empty
- **AND** stderr contains a JSON error object (when `--json` is in effect or stdout is piped)

### Requirement: Callback redirect URI matches the dashboard allowlist
The CLI SHALL use the redirect URI authorized by the dashboard for `client_id=docutray-cli` (currently `http://localhost:9876/callback`) for the `--oauth` flow. The callback HTTP listener SHALL bind on the IPv4 loopback interface (`127.0.0.1`) on port `9876` by default. If port `9876` is in use, the CLI SHALL retry on the next 3 ports (`9877`, `9878`, `9879`) before failing with a clear error — those ports work only if the user's browser ignores the port mismatch on localhost; in practice, port `9876` is the one Better Auth will redirect to.

#### Scenario: Callback URL uses localhost:9876
- **WHEN** the OAuth callback server is started for `--oauth`
- **THEN** the redirect URI included in the authorization URL is `http://localhost:9876/callback`
- **AND** the callback server is bound on `127.0.0.1:9876`

#### Scenario: Port collision falls through to retries
- **WHEN** another process is using port `9876` at startup
- **THEN** the CLI retries on `9877`, `9878`, `9879` before giving up
- **AND** if all retries fail, the CLI exits non-zero with an error mentioning the port is in use

### Requirement: OAuth callback error surfaces to the user
When the OAuth callback delivers an error (e.g. `error=access_denied`), the CLI SHALL exit non-zero with an error message that includes the provider's error or error description, and SHALL NOT modify `~/.config/docutray/config.json`.

#### Scenario: Provider-delivered error is reported
- **WHEN** the user clicks "Cancel" or denies the authorization in the browser, causing the callback to receive `?error=access_denied&error_description=User+denied+access`
- **THEN** the CLI exits non-zero
- **AND** stderr contains the error description (`User denied access` or equivalent)
- **AND** `~/.config/docutray/config.json` is not modified

### Requirement: OAuth listener cleanup
The CLI SHALL close the localhost HTTP listener on every exit path of `--oauth`, including success, timeout, callback error, exception during token exchange, and process termination via SIGINT or SIGTERM. The listener SHALL force-close any lingering connections so the CLI process exits promptly.

#### Scenario: Listener closes on success
- **WHEN** `docutray login --oauth` completes successfully
- **THEN** the localhost HTTP server is closed and the process exits within a short time (no socket lingering preventing exit)

#### Scenario: Listener closes on timeout
- **WHEN** `docutray login --oauth --timeout 1` times out
- **THEN** the localhost HTTP server is closed before the process exits

#### Scenario: Listener closes on SIGINT
- **WHEN** the user presses Ctrl-C while `docutray login --oauth` is waiting for the callback
- **THEN** the localhost HTTP server is closed and the process exits non-zero
- **AND** subsequent `docutray login --oauth` invocations succeed without port-related errors

### Requirement: Help text documents OAuth flags
The output of `docutray login --help` SHALL document the `--oauth`, `--no-browser`, and `--timeout` flags and SHALL include at least one example showing `docutray login --oauth`.

#### Scenario: Help mentions --oauth
- **WHEN** the user runs `docutray login --help`
- **THEN** the help output includes a description for `--oauth`
- **AND** the help output includes a description for `--no-browser`
- **AND** the help output includes a description for `--timeout`
- **AND** the help output contains an example invocation `docutray login --oauth`

### Requirement: Non-interactive error message references --oauth
When `docutray login` is invoked from a non-interactive shell with no API key argument, no `--api-key` flag, and no `--oauth` flag, the CLI SHALL exit non-zero with an error message that mentions all three options.

#### Scenario: Empty stdin in non-TTY with no flags
- **WHEN** the user runs `echo "" | docutray login` (stderr non-TTY, no api-key, no --oauth)
- **THEN** the process exits non-zero
- **AND** stderr contains an error message that mentions `--api-key`, an api-key argument, AND `--oauth` as the three valid non-interactive options
