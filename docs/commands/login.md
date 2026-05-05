`docutray login`
================

Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. For non-interactive shells (CI, AI coding agents), use --oauth to drive the OAuth flow end-to-end without a TTY: the CLI prints the authorization URL on stderr, opens your browser, waits for the callback, and writes the resulting API key to ~/.config/docutray/config.json.

* [`docutray login [API-KEY]`](#docutray-login-api-key)

## `docutray login [API-KEY]`

Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. For non-interactive shells (CI, AI coding agents), use --oauth to drive the OAuth flow end-to-end without a TTY: the CLI prints the authorization URL on stderr, opens your browser, waits for the callback, and writes the resulting API key to ~/.config/docutray/config.json.

```
USAGE
  $ docutray login [API-KEY] [--api-key <value>] [--base-url <value>] [--json] [--no-browser] [--oauth]
    [--timeout <value>]

ARGUMENTS
  [API-KEY]  API key to save (omit for interactive prompt)

FLAGS
  --api-key=<value>   API key for non-interactive login
  --base-url=<value>  Custom base URL for the DocuTray API (default: https://app.docutray.com)
  --json              Output as JSON (default when piped)
  --no-browser        Skip opening the browser; print the URL only (--oauth only)
  --oauth             Login via OAuth in the browser (works without a TTY)
  --timeout=<value>   [default: 180] OAuth callback timeout in seconds (--oauth only)

DESCRIPTION
  Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting
  an existing API key or authenticating via OAuth2 in the browser. For non-interactive shells (CI, AI coding agents),
  use --oauth to drive the OAuth flow end-to-end without a TTY: the CLI prints the authorization URL on stderr, opens
  your browser, waits for the callback, and writes the resulting API key to ~/.config/docutray/config.json.

EXAMPLES
  Interactive login — choose API key or OAuth2 browser login

    $ docutray login

  Login via OAuth in the browser (works in agents/CI without a TTY)

    $ docutray login --oauth

  Print the OAuth URL but do not open the browser

    $ docutray login --oauth --no-browser

  Non-interactive login with API key as argument

    $ docutray login dt_live_abc123

  Non-interactive login with API key flag

    $ docutray login --api-key dt_live_abc123

  Login with a custom API base URL

    $ docutray login --base-url https://staging.docutray.com

  Alternative: use env var instead of login

    DOCUTRAY_API_KEY=dt_live_abc123 docutray status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/login
```

_See code: [src/commands/login.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/login.ts)_
