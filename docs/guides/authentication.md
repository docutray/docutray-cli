# Authentication

This guide covers how to authenticate the DocuTray CLI, choose the organization your API key belongs to, and configure authentication for different environments.

Every API key belongs to one DocuTray organization: conversions, document types and usage all happen in that organization.

## Authentication methods

The CLI reads the API key from one of two places. When both are present, the environment variable takes precedence.

| Method | Best for | How |
| --- | --- | --- |
| Config file | Your machine, AI coding agents | `docutray login --oauth` (or `docutray login <key>`) |
| `DOCUTRAY_API_KEY` | CI/CD, containers, serverless | Export the variable |

### 1. Log in with OAuth (recommended)

```bash
docutray login --oauth
```

The CLI prints the authorization URL on stderr, opens your browser and waits for the callback (180 seconds by default). In the browser:

1. Sign in to DocuTray if you aren't already.
2. On the consent screen, **choose the organization** the CLI will work with. Your active organization is preselected, and the one you choose also becomes your active organization in the DocuTray dashboard.
3. Click **Authorize**.

The CLI then creates an API key for that organization and stores it in `~/.config/docutray/config.json` (permissions `0600`). In a terminal it prints `✓ Login successful — Acme (dtQx****7aZk)`. With `--json`, or when stdout is piped (as in an agent shell), it prints JSON; the key is masked:

```json
{
  "message": "Login successful",
  "apiKey": "dtQx****7aZk",
  "organizationId": "…",
  "organizationName": "Acme",
  "configPath": "/home/user/.config/docutray/config.json"
}
```

`--oauth` works without a TTY, so AI coding agents (Claude Code, Cursor, Codex) can run it: the key never enters the agent's conversation. Useful flags:

```bash
docutray login --oauth --no-browser   # print the URL only; open it yourself
docutray login --oauth --timeout 60   # wait 60 seconds for the callback
```

The browser must run on the same machine as the CLI: after you authorize, it redirects to `http://localhost:9876/callback`. Over SSH or in a remote container, forward the port first (`ssh -L 9876:localhost:9876 <host>`) or use an API key instead.

Running `docutray login` with no arguments in a terminal asks whether you already have an API key: answer `N` to use this same OAuth flow, or `y` to paste a key.

#### Switching organizations

Run `docutray login --oauth` again and choose another organization on the consent screen. The new key replaces the one in the config file. Against staging or a self-hosted deployment, pass the same `--base-url` again (see [Custom API base URL](#custom-api-base-url)).

Each OAuth login creates a **new** API key on the server, and `docutray logout` only deletes the local file. Keys from earlier logins stay active until you revoke them in the dashboard (see [Getting an API key from the dashboard](#getting-an-api-key-from-the-dashboard)): they appear as `CLI - <organization name>`.

### 2. Paste an existing API key

```bash
docutray login <your-api-key>
# or
docutray login --api-key <your-api-key>
```

The key keeps the organization it was created in. Use this when there's no browser available, or to reuse a key created in the dashboard.

### 3. Environment variable (recommended for CI/CD)

```bash
export DOCUTRAY_API_KEY=<your-api-key>
docutray convert invoice.pdf --type electronic-invoice
```

This is the recommended method for:
- CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- Docker containers
- Serverless functions

## Getting an API key from the dashboard

1. Sign in to the [DocuTray Dashboard](https://app.docutray.com) and switch to the organization you want the key for.
2. Go to **Settings > Organization > API Keys**.
3. Click **New API Key**, enter a name, then click **Create API Key** and copy the key. It is shown only once.

Dashboard keys may have no prefix; keys created by `docutray login --oauth` start with `dt`. The CLI accepts both. Revoke keys you no longer use from the same page.

## Verifying authentication

```bash
docutray status
```

Output:

```json
{
  "authenticated": true,
  "apiKey": "dtQx****7aZk",
  "source": "config",
  "baseUrl": "https://app.docutray.com",
  "configPath": "/home/user/.config/docutray/config.json",
  "organizationId": "…",
  "organizationName": "Acme"
}
```

The `source` field indicates where the API key was found: `environment`, `config`, or `none`. `organizationId` and `organizationName` describe the organization of the last `docutray login --oauth` saved in the config file. When `source` is `environment`, they do not describe the key in `DOCUTRAY_API_KEY`.

## CI/CD configuration

### GitHub Actions

```yaml
jobs:
  process-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @docutray/cli
      - run: docutray convert invoice.pdf --type electronic-invoice
        env:
          DOCUTRAY_API_KEY: ${{ secrets.DOCUTRAY_API_KEY }}
```

### GitLab CI

```yaml
process-docs:
  image: node:20
  script:
    - npm install -g @docutray/cli
    - docutray convert invoice.pdf --type electronic-invoice
  variables:
    DOCUTRAY_API_KEY: $DOCUTRAY_API_KEY
```

### Docker

```dockerfile
FROM node:20-slim
RUN npm install -g @docutray/cli
ENV DOCUTRAY_API_KEY=""
CMD ["docutray", "convert", "invoice.pdf", "--type", "electronic-invoice"]
```

```bash
docker run -e DOCUTRAY_API_KEY="$DOCUTRAY_API_KEY" my-processor
```

## Custom API base URL

For staging environments or self-hosted deployments:

```bash
# Via login (stored in the config file)
docutray login --oauth --base-url https://staging.docutray.com

# Via environment variable
export DOCUTRAY_BASE_URL=https://staging.docutray.com
```

Pass `--base-url` on **every** `login` against a deployment other than production, including when you switch organizations. Check the stored URL with `docutray status`.

## Logging out

To remove stored credentials from the local machine:

```bash
docutray logout
```

This deletes the config file. It does **not** invalidate the API key on the server — revoke keys from the dashboard.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Logged into the wrong organization | Another organization was chosen on the consent screen, or the CLI is older than 0.5.0 (it picked one on its own) | Run `docutray login --oauth` again and choose the organization. Check `docutray --version` and upgrade with `npm install -g @docutray/cli@latest` if it is below 0.5.0 |
| `OAuth error (invalid_scope): The following scopes are invalid: docutray:cli` | The DocuTray deployment predates choosing the organization at login (typically a custom `--base-url`) | Use `docutray login --api-key <key>` with a key created in that deployment's dashboard |
| `Organization was not chosen in the browser; using: <name>` on stderr | The server did not bind the login to an organization, so the CLI used the first one it listed | Check `organizationName` in the output; use `--api-key` if it is not the one you want |
| `OAuth error (access_denied): …` | *Deny* was clicked on the consent screen | Run the login again and click **Authorize** |
| `Failed to fetch organizations: …` or `API key creation failed: …` with `Vuelve a iniciar sesión` | You are no longer a member of the organization you chose | Run `docutray login --oauth` again and choose another organization |
| `Port 9876 is already in use…` | Another `docutray login` is still waiting for its callback, or another program uses the port | Finish or stop the other login (`lsof -nP -iTCP:9876` shows the process), then retry |
| Login times out | The consent wasn't completed in the browser, or the browser runs on another machine (SSH, remote container) and its redirect to `localhost:9876` never reaches the CLI | Complete the consent, pass `--timeout` for more time, or forward port 9876 to the machine running the CLI |

## Security best practices

- Never commit API keys to version control
- Use environment variables in CI/CD, not `docutray login`
- Revoke keys you no longer use, including those left by earlier OAuth logins
- Rotate keys periodically from the dashboard
- Use separate keys for production and development
- The config file is created with `0600` permissions (owner-only read/write)
