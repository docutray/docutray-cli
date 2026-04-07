`docutray status`
=================

Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.

* [`docutray status`](#docutray-status)

## `docutray status`

Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.

```
USAGE
  $ docutray status [--json]

FLAGS
  --json  Output as JSON (default when piped)

DESCRIPTION
  Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the
  credential source (environment variable or config file), the API base URL, and the config file path. Useful for
  verifying your setup before running commands.

EXAMPLES
  Check current authentication status

    $ docutray status

  Output as JSON (default when piped)

    $ docutray status --json

  Verify env var authentication is detected

    DOCUTRAY_API_KEY=dt_live_abc123 docutray status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/status
```

_See code: [src/commands/status.ts](https://github.com/docutray/docutray-cli/blob/v0.1.2/src/commands/status.ts)_
