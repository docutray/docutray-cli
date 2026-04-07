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
* [`docutray autocomplete [SHELL]`](#docutray-autocomplete-shell)
* [`docutray convert SOURCE`](#docutray-convert-source)
* [`docutray identify SOURCE`](#docutray-identify-source)
* [`docutray login [API-KEY]`](#docutray-login-api-key)
* [`docutray logout`](#docutray-logout)
* [`docutray status`](#docutray-status)
* [`docutray steps run STEP-ID SOURCE`](#docutray-steps-run-step-id-source)
* [`docutray steps status EXECUTION-ID`](#docutray-steps-status-execution-id)
* [`docutray types export CODE`](#docutray-types-export-code)
* [`docutray types get CODE`](#docutray-types-get-code)
* [`docutray types list`](#docutray-types-list)

## `docutray autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ docutray autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ docutray autocomplete

  $ docutray autocomplete bash

  $ docutray autocomplete zsh

  $ docutray autocomplete powershell

  $ docutray autocomplete --refresh-cache

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/autocomplete
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.45/src/commands/autocomplete/index.ts)_

## `docutray convert SOURCE`

Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.

```
USAGE
  $ docutray convert SOURCE -t <value> [--async] [--json] [--metadata <value>] [--webhook-url <value>]

ARGUMENTS
  SOURCE  File path or URL to convert

FLAGS
  -t, --type=<value>         (required) Document type code to use for extraction (see: docutray types list)
      --async                Use async processing with polling (default: false). Status updates are emitted to stderr.
      --json                 Output as JSON (default when piped)
      --metadata=<value>     JSON metadata to attach to the conversion (e.g. '{"key":"value"}')
      --webhook-url=<value>  Webhook URL to receive a POST notification when conversion completes

DESCRIPTION
  Convert a document to structured data using a specified document type schema. Accepts a local file path or a public
  URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use
  --async for long-running documents to poll for completion with status updates on stderr.

EXAMPLES
  Convert a local PDF using a document type

    $ docutray convert invoice.pdf --type electronic-invoice

  Convert a document from a URL

    $ docutray convert https://example.com/doc.pdf -t electronic-invoice

  Use async processing with status polling

    $ docutray convert invoice.pdf -t electronic-invoice --async

  Convert with webhook notification on completion

    $ docutray convert receipt.jpg -t receipt --webhook-url https://example.com/hook

  Attach custom metadata to the conversion

    $ docutray convert invoice.pdf -t electronic-invoice --metadata '{"ref":"order-123"}'

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/convert
```

_See code: [src/commands/convert.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/convert.ts)_

## `docutray identify SOURCE`

Identify the type of a document by analyzing its content. Returns the best-matching document type along with alternative matches ranked by confidence score. Use --types to restrict identification to a specific set of document types. Accepts a local file path or a public URL.

```
USAGE
  $ docutray identify SOURCE [--async] [--json] [--types <value>]

ARGUMENTS
  SOURCE  File path or URL to identify

FLAGS
  --async          Use async processing with polling (default: false). Status updates are emitted to stderr.
  --json           Output as JSON (default when piped)
  --types=<value>  Comma-separated list of document type codes to restrict identification (e.g. invoice,receipt)

DESCRIPTION
  Identify the type of a document by analyzing its content. Returns the best-matching document type along with
  alternative matches ranked by confidence score. Use --types to restrict identification to a specific set of document
  types. Accepts a local file path or a public URL.

EXAMPLES
  Identify a local document

    $ docutray identify document.pdf

  Identify a document from a URL

    $ docutray identify https://example.com/doc.pdf

  Restrict to specific document types

    $ docutray identify document.pdf --types invoice,receipt,contract

  Force JSON output

    $ docutray identify document.pdf --json

  Use async processing with status polling

    $ docutray identify document.pdf --async

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/identify
```

_See code: [src/commands/identify.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/identify.ts)_

## `docutray login [API-KEY]`

Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.

```
USAGE
  $ docutray login [API-KEY] [--base-url <value>] [--json]

ARGUMENTS
  [API-KEY]  API key to save (omit for interactive prompt)

FLAGS
  --base-url=<value>  Custom base URL for the DocuTray API (default: https://app.docutray.com)
  --json              Output as JSON (default when piped)

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

_See code: [src/commands/login.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/logout.ts)_

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

_See code: [src/commands/status.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/status.ts)_

## `docutray steps run STEP-ID SOURCE`

Execute a processing step on a document. Steps are reusable processing pipelines configured in the DocuTray dashboard. By default, the command waits for the step to complete and returns the result. Use --no-wait to return the execution status immediately without polling. Accepts a local file path or a public URL as the document source.

```
USAGE
  $ docutray steps:run STEP-ID SOURCE [--json] [--metadata <value>] [--no-wait] [--webhook-url <value>]

ARGUMENTS
  STEP-ID  Step ID to execute
  SOURCE   File path or URL to process

FLAGS
  --json                 Output as JSON (default when piped)
  --metadata=<value>     JSON metadata to attach to the execution (e.g. '{"key":"value"}')
  --no-wait              Return immediately with execution status instead of waiting for completion (default: false)
  --webhook-url=<value>  Webhook URL to receive a POST notification when the step completes

DESCRIPTION
  Execute a processing step on a document. Steps are reusable processing pipelines configured in the DocuTray dashboard.
  By default, the command waits for the step to complete and returns the result. Use --no-wait to return the execution
  status immediately without polling. Accepts a local file path or a public URL as the document source.

EXAMPLES
  Run a step on a local file and wait for results

    $ docutray steps run extract-fields invoice.pdf

  Run a step on a document URL

    $ docutray steps run extract-fields https://example.com/doc.pdf

  Start execution and return immediately (async)

    $ docutray steps run extract-fields invoice.pdf --no-wait

  Attach custom metadata to the execution

    $ docutray steps run extract-fields invoice.pdf --metadata '{"ref":"order-123"}'

  Receive a webhook notification on completion

    $ docutray steps run extract-fields invoice.pdf --webhook-url https://example.com/hook

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/steps/run
```

_See code: [src/commands/steps/run.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/steps/run.ts)_

## `docutray steps status EXECUTION-ID`

Query the current status of a step execution by its execution ID. Use this to check progress on executions started with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress, and result data when complete.

```
USAGE
  $ docutray steps:status EXECUTION-ID [--json]

ARGUMENTS
  EXECUTION-ID  Step execution ID to query

FLAGS
  --json  Output as JSON (default when piped)

DESCRIPTION
  Query the current status of a step execution by its execution ID. Use this to check progress on executions started
  with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress,
  and result data when complete.

EXAMPLES
  Check the status of an execution

    $ docutray steps status exec_abc123

  Output as JSON

    $ docutray steps status exec_abc123 --json

  Start async execution then check its status

    $ docutray steps run my-step doc.pdf --no-wait | jq -r .id | xargs docutray steps status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/steps/status
```

_See code: [src/commands/steps/status.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/steps/status.ts)_

## `docutray types export CODE`

Export a document type definition to JSON format. By default, writes to stdout for piping or redirection. Use --output to write directly to a file. Useful for backing up type definitions, version-controlling them in Git, or migrating types between environments.

```
USAGE
  $ docutray types:export CODE [--force] [--json] [-o <value>]

ARGUMENTS
  CODE  Document type code

FLAGS
  -o, --output=<value>  Output file path. If omitted, writes to stdout.
      --force           Overwrite existing file
      --json            Output as JSON (default when piped)

DESCRIPTION
  Export a document type definition to JSON format. By default, writes to stdout for piping or redirection. Use --output
  to write directly to a file. Useful for backing up type definitions, version-controlling them in Git, or migrating
  types between environments.

EXAMPLES
  Export a document type to stdout

    $ docutray types export electronic-invoice

  Export directly to a file

    $ docutray types export electronic-invoice -o invoice-type.json

  Export using shell redirection

    $ docutray types export electronic-invoice > backup.json

  Export and pretty-print with jq

    $ docutray types export electronic-invoice | jq .

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/export
```

_See code: [src/commands/types/export.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/types/export.ts)_

## `docutray types get CODE`

Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.

```
USAGE
  $ docutray types:get CODE [--json]

ARGUMENTS
  CODE  Document type code

FLAGS
  --json  Output as JSON (default when piped)

DESCRIPTION
  Get the full details of a document type by its code. Returns the type name, description, field schema, and
  configuration. Use this to inspect a document type before converting documents or to verify type settings.

EXAMPLES
  Get full details of a document type

    $ docutray types get electronic-invoice

  Output full JSON (includes field schema)

    $ docutray types get electronic-invoice --json

  Extract just the field schema (useful for scripts)

    $ docutray types get electronic-invoice | jq .fields

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/get
```

_See code: [src/commands/types/get.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/types/get.ts)_

## `docutray types list`

List available document types with pagination and search. Document types define the extraction schema used when converting documents. Results are paginated — use --page and --limit to navigate through large result sets. Use --search to filter by name.

```
USAGE
  $ docutray types:list [--json] [--limit <value>] [--page <value>] [--search <value>]

FLAGS
  --json            Output as JSON (default when piped)
  --limit=<value>   [default: 20] Number of results per page
  --page=<value>    [default: 1] Page number for pagination
  --search=<value>  Filter document types by name (case-insensitive substring match)

DESCRIPTION
  List available document types with pagination and search. Document types define the extraction schema used when
  converting documents. Results are paginated — use --page and --limit to navigate through large result sets. Use
  --search to filter by name.

EXAMPLES
  List all document types (first page, default 20 results)

    $ docutray types list

  Search for document types by name

    $ docutray types list --search invoice

  Paginate through results

    $ docutray types list --limit 50 --page 2

  Force JSON output

    $ docutray types list --json

  Extract just the type codes (useful for scripting)

    $ docutray types list | jq ".data[].codeType"

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/list
```

_See code: [src/commands/types/list.ts](https://github.com/docutray/docutray-cli/blob/v0.1.0/src/commands/types/list.ts)_
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
