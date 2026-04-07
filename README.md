@docutray/cli
=============

[![npm version](https://img.shields.io/npm/v/@docutray/cli.svg)](https://www.npmjs.com/package/@docutray/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

Official [DocuTray](https://docutray.com) CLI — AI-powered document processing from the command line.

Designed for **AI agents** (Claude Code, Copilot, Codex) and **automation pipelines**. All output is JSON by default, with clear exit codes and no interactive prompts (except `login`).

## Installation

```bash
npm install -g @docutray/cli
```

Or run directly without installing:

```bash
npx @docutray/cli <command>
```

## Quickstart

```bash
# Authenticate with your API key
docutray login

# List available document types
docutray types list

# Convert a document to structured data
docutray convert invoice.pdf --type electronic-invoice
```


## Commands

<!-- commands -->
# Command Topics

* [`docutray autocomplete`](docs/commands/autocomplete.md) - Display autocomplete installation instructions.
* [`docutray convert`](docs/commands/convert.md) - Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.
* [`docutray identify`](docs/commands/identify.md) - Identify the type of a document by analyzing its content. Returns the best-matching document type along with alternative matches ranked by confidence score. Use --types to restrict identification to a specific set of document types. Accepts a local file path or a public URL.
* [`docutray login`](docs/commands/login.md) - Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.
* [`docutray logout`](docs/commands/logout.md) - Clear stored credentials by removing the local configuration file. This does not invalidate the API key itself — it only removes it from this machine. Has no effect if you are authenticating via the DOCUTRAY_API_KEY environment variable.
* [`docutray status`](docs/commands/status.md) - Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.
* [`docutray steps`](docs/commands/steps.md) - Execute and monitor document processing steps. Steps are reusable processing pipelines that can be applied to documents for extraction, transformation, and validation.
* [`docutray types`](docs/commands/types.md) - Manage document types (extraction schemas). Document types define the fields and structure that DocuTray extracts from documents during conversion.

<!-- commandsstop -->

## Authentication

The CLI resolves the API key in this order:

1. **Environment variable** `DOCUTRAY_API_KEY` (recommended for CI/CD and AI agents)
2. **Config file** `~/.config/docutray/config.json` (set via `docutray login`)

### CI/CD and automation

```bash
# Set the env var in your CI pipeline
export DOCUTRAY_API_KEY=dt_live_abc123

# All commands will use it automatically
docutray convert invoice.pdf --type electronic-invoice
```

### Multiple environments

```bash
# Use --base-url for staging or custom deployments
docutray login --base-url https://staging.docutray.com
```

## Output format

- **JSON by default** — optimized for programmatic consumption by AI agents and scripts
- **`--table` flag** — human-readable table format (available on list/get/identify commands)
- **Exit code `0`** — success
- **Exit code `1`** — error, with JSON error details on stderr

### Piping and composition

```bash
# Extract specific fields with jq
docutray types list | jq '.data[].codeType'

# Chain commands
docutray identify document.pdf | jq -r '.document_type.code' | xargs -I{} docutray convert document.pdf -t {}

# Use in shell scripts
if docutray status | jq -e '.authenticated' > /dev/null 2>&1; then
  echo "Authenticated"
fi
```

## Development

```bash
git clone https://github.com/docutray/docutray-cli.git
cd docutray-cli
npm install
npm run build
npm link
```

### Scripts

```bash
npm run dev              # Watch mode for TypeScript compilation
npm run build            # Compile TypeScript
npm run test             # Run tests
npm run docs:generate    # Regenerate command reference docs
```

## Documentation

- [Authentication guide](docs/guides/authentication.md)
- [Document processing guide](docs/guides/document-processing.md)
- [Document types guide](docs/guides/document-types.md)
- [AI agent usage guide](docs/guides/ai-agent-usage.md)
- [Command reference](docs/commands/)

## Links

- [API Documentation](https://docs.docutray.com)
- [Node SDK](https://www.npmjs.com/package/docutray)
- [Dashboard](https://app.docutray.com)
