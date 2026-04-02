`docutray login`
================

Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

* [`docutray login [API-KEY]`](#docutray-login-api-key)

## `docutray login [API-KEY]`

Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

```
USAGE
  $ docutray login [API-KEY] [--base-url <value>]

ARGUMENTS
  [API-KEY]  API key to save (omit for interactive prompt)

FLAGS
  --base-url=<value>  Custom base URL for the DocuTray API (default: https://app.docutray.com)

DESCRIPTION
  Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key
  (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use.
  Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

EXAMPLES
  Interactive login — prompts for your API key

    $ docutray login

  Non-interactive login with API key as argument

    $ docutray login dt_live_abc123

  Login with a custom API base URL (e.g. staging)

    $ docutray login --base-url https://staging.docutray.com

  Alternative: use env var instead of login (recommended for CI/CD)

    DOCUTRAY_API_KEY=dt_live_abc123 docutray status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/login
```
