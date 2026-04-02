# Document processing

This guide covers the full document processing workflow — from converting documents to structured data, to identifying document types, and handling asynchronous operations.

## Converting documents

The `convert` command extracts structured data from a document using a specified document type schema.

### Basic usage

```bash
# Convert a local file
docutray convert invoice.pdf --type electronic-invoice

# Convert from a URL
docutray convert https://example.com/doc.pdf --type electronic-invoice
```

### Synchronous vs asynchronous processing

By default, `convert` processes synchronously — the command blocks until the result is ready:

```bash
docutray convert invoice.pdf --type electronic-invoice
# Waits and returns the extracted data as JSON
```

For long-running documents, use `--async` to enable polling with status updates:

```bash
docutray convert large-document.pdf --type electronic-invoice --async
# Status updates are emitted to stderr as JSON:
# {"status":"processing"}
# {"status":"processing"}
# Final result is written to stdout
```

### Webhooks

Instead of polling, you can receive a notification when processing completes:

```bash
docutray convert invoice.pdf --type electronic-invoice --webhook-url https://example.com/hooks/docutray
```

### Attaching metadata

Attach custom metadata to a conversion for tracking purposes:

```bash
docutray convert invoice.pdf --type electronic-invoice --metadata '{"orderId":"ORD-123","source":"email"}'
```

Metadata is stored with the conversion result and included in webhook payloads.

## Identifying documents

The `identify` command analyzes a document and returns the best-matching document type with a confidence score.

```bash
docutray identify document.pdf
```

Output:

```json
{
  "document_type": {
    "code": "electronic-invoice",
    "name": "Electronic Invoice",
    "confidence": 0.95
  },
  "alternatives": [
    {
      "code": "receipt",
      "name": "Receipt",
      "confidence": 0.12
    }
  ]
}
```

### Restricting to specific types

Narrow identification to a known set of document types:

```bash
docutray identify document.pdf --types invoice,receipt,contract
```

### Table output

For human-readable output:

```bash
docutray identify document.pdf --table
```

```
code                name                confidence
------------------  ------------------  ----------
electronic-invoice  Electronic Invoice  0.95
receipt             Receipt             0.12
```

## Processing steps

Steps are reusable processing pipelines configured in the DocuTray dashboard.

### Running a step

```bash
# Run a step and wait for results
docutray steps run extract-fields invoice.pdf

# Run a step on a URL
docutray steps run extract-fields https://example.com/doc.pdf
```

### Async step execution

Start a step and return immediately:

```bash
docutray steps run extract-fields invoice.pdf --no-wait
```

Output:

```json
{
  "id": "exec_abc123",
  "status": "pending"
}
```

Then check the status later:

```bash
docutray steps status exec_abc123
```

## Common workflows

### Identify then convert

```bash
# Identify the document type, then convert using the detected type
TYPE=$(docutray identify document.pdf | jq -r '.document_type.code')
docutray convert document.pdf --type "$TYPE"
```

### Batch processing

```bash
# Process all PDFs in a directory
for file in documents/*.pdf; do
  echo "Processing: $file" >&2
  docutray convert "$file" --type electronic-invoice > "results/$(basename "$file" .pdf).json"
done
```

### Error handling in scripts

```bash
if result=$(docutray convert invoice.pdf --type electronic-invoice 2>/dev/null); then
  echo "$result" | jq '.extractedData'
else
  echo "Conversion failed" >&2
  exit 1
fi
```

## Output format

All commands output JSON to stdout by default. Errors are written to stderr as JSON with an `error` field:

```json
{
  "error": "Document type not found: invalid-type",
  "status": 404
}
```

Exit codes:
- `0` — success
- `1` — error (details on stderr)
