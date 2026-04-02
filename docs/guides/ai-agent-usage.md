# AI agent usage

This guide covers how to use the DocuTray CLI from AI agents (Claude Code, GitHub Copilot, Codex) and automation scripts. The CLI is designed with AI agents as a primary audience — every design decision reflects this.

## Design principles for agents

- **JSON output by default** — all commands output structured JSON to stdout, parseable without extra flags
- **No interactive prompts** — every command (except `login`) works non-interactively with flags and arguments
- **Clear exit codes** — `0` for success, `1` for errors with JSON details on stderr
- **Composable** — commands can be piped and chained with standard Unix tools

## Authentication for agents

Use the `DOCUTRAY_API_KEY` environment variable:

```bash
export DOCUTRAY_API_KEY=dt_live_abc123
```

This is the recommended method for agents. Never use `docutray login` from an agent — it requires interactive input.

### Verifying authentication

```bash
docutray status | jq -e '.authenticated'
# Exit code 0 if authenticated, 1 if not
```

## Parsing JSON output

All commands return structured JSON. Use `jq` or your language's JSON parser.

### Extracting fields

```bash
# Get the extracted data from a conversion
docutray convert invoice.pdf -t electronic-invoice | jq '.extractedData'

# Get the detected document type code
docutray identify document.pdf | jq -r '.document_type.code'

# List all document type codes
docutray types list | jq -r '.data[].codeType'
```

### Error handling

Errors are written to stderr as JSON:

```bash
# Capture both stdout and stderr
result=$(docutray convert invoice.pdf -t bad-type 2>error.json)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  error_message=$(jq -r '.error' error.json)
  echo "Failed: $error_message"
fi
```

## Common agent patterns

### Identify then convert

The most common workflow — detect the document type, then convert:

```bash
TYPE=$(docutray identify document.pdf | jq -r '.document_type.code')
docutray convert document.pdf --type "$TYPE"
```

### Batch processing with error collection

```bash
errors=()
for file in documents/*.pdf; do
  if ! docutray convert "$file" -t electronic-invoice > "results/$(basename "$file" .pdf).json" 2>/dev/null; then
    errors+=("$file")
  fi
done

if [ ${#errors[@]} -gt 0 ]; then
  echo "Failed files: ${errors[*]}" >&2
fi
```

### Checking if a document type exists

```bash
if docutray types get my-type > /dev/null 2>&1; then
  echo "Type exists"
else
  echo "Type not found"
fi
```

### Async processing with status polling

```bash
# Start step execution without waiting
exec_id=$(docutray steps run extract-fields invoice.pdf --no-wait | jq -r '.id')

# Poll until complete
while true; do
  status=$(docutray steps status "$exec_id" | jq -r '.status')
  case "$status" in
    completed) break ;;
    failed) echo "Step failed" >&2; exit 1 ;;
    *) sleep 2 ;;
  esac
done

# Get final result
docutray steps status "$exec_id"
```

## Integration examples

### Claude Code

When using DocuTray from Claude Code, the CLI's JSON output and clear exit codes make it straightforward:

```
You: Convert invoice.pdf using the electronic-invoice type
Claude Code: $ docutray convert invoice.pdf --type electronic-invoice
```

Claude Code can parse the JSON output directly and present results in a readable format.

### GitHub Actions

```yaml
- name: Process documents
  env:
    DOCUTRAY_API_KEY: ${{ secrets.DOCUTRAY_API_KEY }}
  run: |
    for file in uploads/*.pdf; do
      docutray convert "$file" -t electronic-invoice > "processed/$(basename "$file" .pdf).json"
    done
```

### Node.js scripts

```javascript
import { execSync } from 'node:child_process';

const result = JSON.parse(
  execSync('docutray convert invoice.pdf -t electronic-invoice', {
    encoding: 'utf-8',
    env: { ...process.env, DOCUTRAY_API_KEY: 'dt_live_abc123' },
  })
);

console.log(result.extractedData);
```

### Python scripts

```python
import json
import os
import subprocess

result = subprocess.run(
    ["docutray", "convert", "invoice.pdf", "-t", "electronic-invoice"],
    capture_output=True, text=True,
    env={**os.environ, "DOCUTRAY_API_KEY": "dt_live_abc123"}
)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print(data["extractedData"])
else:
    error = json.loads(result.stderr)
    print(f"Error: {error['error']}")
```

## Tips for agent developers

1. **Always check exit codes** — don't assume success
2. **Parse stderr for errors** — error details are always JSON on stderr
3. **Use `--type` explicitly** — don't rely on auto-detection for production workflows
4. **Prefer env vars** — `DOCUTRAY_API_KEY` is the most portable auth method
5. **Use `jq -e`** — the `-e` flag makes `jq` exit with code 1 when the result is `false` or `null`, useful for conditionals
6. **Pipe through `jq -r`** — the `-r` flag outputs raw strings without quotes, better for shell variables
