`docutray status`
=================

Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.

* [`docutray status`](#docutray-status)

## `docutray status`

Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.

```
USAGE
  $ docutray status

DESCRIPTION
  Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the
  credential source (environment variable or config file), the API base URL, and the config file path. Useful for
  verifying your setup before running commands.

EXAMPLES
  Check current authentication status

    $ docutray status

  Check if authenticated (JSON output, useful for scripts)

    $ docutray status | jq .authenticated

  Verify env var authentication is detected

    DOCUTRAY_API_KEY=dt_live_abc123 docutray status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/status
```
