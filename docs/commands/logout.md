`docutray logout`
=================

Clear stored credentials by removing the local configuration file. This does not invalidate the API key itself — it only removes it from this machine. Has no effect if you are authenticating via the DOCUTRAY_API_KEY environment variable.

* [`docutray logout`](#docutray-logout)

## `docutray logout`

Clear stored credentials by removing the local configuration file. This does not invalidate the API key itself — it only removes it from this machine. Has no effect if you are authenticating via the DOCUTRAY_API_KEY environment variable.

```
USAGE
  $ docutray logout [--json]

FLAGS
  --json  Output as JSON (default when piped)

DESCRIPTION
  Clear stored credentials by removing the local configuration file. This does not invalidate the API key itself — it
  only removes it from this machine. Has no effect if you are authenticating via the DOCUTRAY_API_KEY environment
  variable.

EXAMPLES
  Remove stored API key from local config

    $ docutray logout

  Logout and verify authentication is cleared

    $ docutray logout && docutray status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/logout
```

_See code: [src/commands/logout.ts](https://github.com/docutray/docutray-cli/blob/v0.1.2/src/commands/logout.ts)_
