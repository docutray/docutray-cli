`docutray login`
================

Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. OAuth2 login opens your browser, lets you select an organization, and automatically generates an API key. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

* [`docutray login [API-KEY]`](#docutray-login-api-key)

## `docutray login [API-KEY]`

Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. OAuth2 login opens your browser, lets you select an organization, and automatically generates an API key. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

```
USAGE
  $ docutray login [API-KEY] [--api-key <value>] [--base-url <value>] [--json]

ARGUMENTS
  [API-KEY]  API key to save (omit for interactive prompt)

FLAGS
  --api-key=<value>   API key for non-interactive login
  --base-url=<value>  Custom base URL for the DocuTray API (default: https://app.docutray.com)
  --json              Output as JSON (default when piped)

DESCRIPTION
  Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting
  an existing API key or authenticating via OAuth2 in the browser. OAuth2 login opens your browser, lets you select an
  organization, and automatically generates an API key. Credentials are stored in ~/.config/docutray/config.json with
  restricted file permissions.

EXAMPLES
  Interactive login — choose API key or OAuth2 browser login

    $ docutray login

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
