# Authentication

This guide covers how to authenticate the DocuTray CLI, manage API keys, and configure authentication for different environments.

## Getting an API key

1. Sign in to the [DocuTray Dashboard](https://app.docutray.com)
2. Navigate to **Settings > API Keys**
3. Click **Create API Key** and copy the generated key (it starts with `dt_`)

## Authentication methods

The CLI supports two authentication methods. When both are present, the environment variable takes precedence.

### 1. Environment variable (recommended for CI/CD)

Set `DOCUTRAY_API_KEY` in your environment:

```bash
export DOCUTRAY_API_KEY=dt_live_abc123
docutray convert invoice.pdf --type electronic-invoice
```

This is the recommended method for:
- CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- AI agents (Claude Code, Copilot, Codex)
- Docker containers
- Serverless functions

### 2. Config file (recommended for local development)

Use the `login` command to store your key locally:

```bash
docutray login
# Or non-interactively:
docutray login dt_live_abc123
```

Credentials are stored in `~/.config/docutray/config.json` with restricted file permissions (`0600`).

## Verifying authentication

```bash
docutray status
```

Output:

```json
{
  "authenticated": true,
  "apiKey": "dt_l****c123",
  "source": "environment",
  "baseUrl": "https://app.docutray.com",
  "configPath": "/home/user/.config/docutray/config.json"
}
```

The `source` field indicates where the API key was found: `environment`, `config`, or `none`.

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
docker run -e DOCUTRAY_API_KEY=dt_live_abc123 my-processor
```

## Custom API base URL

For staging environments or self-hosted deployments:

```bash
# Via login
docutray login --base-url https://staging.docutray.com

# Via environment variable
export DOCUTRAY_BASE_URL=https://staging.docutray.com
```

## Logging out

To remove stored credentials from the local machine:

```bash
docutray logout
```

This deletes the config file. It does **not** invalidate the API key on the server — revoke keys from the Dashboard.

## Security best practices

- Never commit API keys to version control
- Use environment variables in CI/CD, not `docutray login`
- Rotate keys periodically from the Dashboard
- Use separate keys for production and development
- The config file is created with `0600` permissions (owner-only read/write)
