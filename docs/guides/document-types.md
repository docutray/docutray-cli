# Document types

This guide covers how to list, inspect, and export document types using the DocuTray CLI. Document types define the extraction schema — the fields and structure that DocuTray extracts from documents during conversion.

## Listing document types

View all available document types:

```bash
docutray types list
```

Output:

```json
{
  "data": [
    {
      "codeType": "electronic-invoice",
      "name": "Electronic Invoice",
      "isPublic": true,
      "isDraft": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Table format

For a quick overview:

```bash
docutray types list --table
```

```
code                name                public  draft
------------------  ------------------  ------  -----
electronic-invoice  Electronic Invoice  yes     no
receipt             Receipt             yes     no
contract            Contract            no      no
```

### Searching

Filter document types by name:

```bash
docutray types list --search invoice
```

### Pagination

Navigate through large result sets:

```bash
# First page, 50 results
docutray types list --limit 50

# Second page
docutray types list --limit 50 --page 2
```

### Extracting type codes

Get just the type codes for scripting:

```bash
docutray types list | jq -r '.data[].codeType'
```

## Getting type details

Inspect a specific document type by its code:

```bash
docutray types get electronic-invoice
```

Returns the full type definition including name, description, field schema, and configuration.

### Table format

```bash
docutray types get electronic-invoice --table
```

## Exporting document types

Export a document type definition to JSON for backup, version control, or migration between environments.

### Export to stdout

```bash
docutray types export electronic-invoice
```

### Export to a file

```bash
docutray types export electronic-invoice --output electronic-invoice.json
```

Output:

```json
{
  "exported": "electronic-invoice.json",
  "code": "electronic-invoice"
}
```

### Backup all types

```bash
mkdir -p type-backups
for code in $(docutray types list | jq -r '.data[].codeType'); do
  docutray types export "$code" --output "type-backups/${code}.json"
  echo "Exported: $code" >&2
done
```

## Creating document types

Create a new document type with a name, code, description, and JSON schema:

```bash
docutray types create \
  --name "Invoice" \
  --code invoice \
  --description "Standard commercial invoice" \
  --schema schema.json
```

The `--schema` flag accepts either a file path or an inline JSON string:

```bash
docutray types create \
  --name "Receipt" \
  --code receipt \
  --description "Purchase receipt" \
  --schema '{"type":"object","properties":{"total":{"type":"number"},"date":{"type":"string"},"vendor":{"type":"string"}}}'
```

### Publishing

By default, types are created as drafts. To publish immediately:

```bash
docutray types create \
  --name "Invoice" \
  --code invoice \
  --description "Standard invoice" \
  --schema schema.json \
  --publish
```

### Conversion modes

Choose how DocuTray processes the document:

```bash
# Default JSON extraction
docutray types create --name "Invoice" --code invoice --description "Invoice" --schema schema.json --conversion-mode json

# Toon mode
docutray types create --name "Invoice" --code invoice_toon --description "Invoice toon" --schema schema.json --conversion-mode toon

# Multi-prompt mode
docutray types create --name "Invoice" --code invoice_multi --description "Invoice multi" --schema schema.json --conversion-mode multi_prompt
```

### Export specs

A document type can carry a conversion spec — the mapping from extracted JSON to
CSV/Excel columns used by tray export. It comes in two shapes, single-table and
multi-sheet:

```json
{"columns": [{"header": "Total", "jsonPath": "$.total"}]}
```

```json
{"sheets": [{"name": "Items", "columns": [{"header": "Item", "jsonPath": "$.items[*].name"}]}]}
```

Pass it as a file path or inline JSON:

```bash
docutray types create --name "Invoice" --code invoice --description "Invoice" \
  --schema schema.json --conversion-spec spec.json
```

`--conversion-spec` also accepts a full `types export` payload and pulls the
`conversionSpec` out of it.

Requires a DocuTray API deployment that supports `conversionSpec` on document
types. Against an older deployment the field is accepted and silently ignored —
run `docutray types get <code>` to confirm the spec was stored.

### Prompt hints

Guide the extraction with custom hints:

```bash
docutray types create \
  --name "Invoice" \
  --code invoice \
  --description "Standard invoice" \
  --schema schema.json \
  --prompt-hints "Use dd/mm/yyyy format for dates. Amounts should include currency symbol." \
  --identify-hints "Look for invoice number, date, and total amount"
```

### Example JSON schema

A minimal but complete extraction schema:

```json
{
  "type": "object",
  "properties": {
    "invoiceNumber": {
      "type": "string",
      "description": "The invoice number or identifier"
    },
    "date": {
      "type": "string",
      "description": "Invoice date in ISO 8601 format"
    },
    "total": {
      "type": "number",
      "description": "Total amount including taxes"
    },
    "lineItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unitPrice": { "type": "number" }
        }
      }
    }
  }
}
```

## Updating document types

Update any field of an existing document type:

```bash
# Update the name
docutray types update invoice --name "Updated Invoice"

# Update the schema
docutray types update invoice --schema new-schema.json

# Update prompt hints
docutray types update invoice --prompt-hints "Use dd/mm/yyyy format for dates"

# Publish a draft
docutray types update invoice --publish

# Replace the export spec
docutray types update invoice --conversion-spec spec.json

# Remove the export spec
docutray types update invoice --no-conversion-spec

# Update multiple fields at once
docutray types update invoice \
  --name "Commercial Invoice v2" \
  --description "Updated extraction schema" \
  --schema updated-schema.json \
  --prompt-hints "Extract amounts in USD"
```

Note: the `codeType` identifier cannot be changed after creation.

Unlike `types create`, `types update --schema` ignores a `conversionSpec`
embedded in a `types export` payload — an update only touches the fields you
name. Use `--conversion-spec` to change it.

## Validation rules (DSL)

Besides its JSON Schema, a document type can have business rules written in the
DocuTray validation DSL: one rule per line, `#` for comments. Both layers run on
the data extracted by every conversion, and the result appears as `validation` in
the output of `convert` and `convert status`. Validation is informational: an
invalid document still converts with status `SUCCESS`.

```txt
# rules.dsl
field.total greaterThan 0
field.currency in("CLP", "USD")
define expected sum field.subtotal field.tax
field.total equalsWithPrecision(calculated.expected, 2)
```

### Reading the rules

```bash
docutray types rules get invoice              # print the rules (TTY) or {codeType, dslRules} (piped)
docutray types rules get invoice --raw > rules.dsl  # save only the rules text
```

### Testing rules without saving them

`types rules test` validates data against the JSON Schema and the rules. With
`--rules` it uses the given rules instead of the stored ones (dry-run). Exit
codes, so it can gate scripts and CI:

| Code | Meaning |
|---|---|
| 0 | The data is valid (warnings do not make it invalid) |
| 1 | The data is invalid |
| 2 | Any other error: API, rules that fail to compile, invalid input |

```bash
# Against the stored rules
docutray types rules test invoice --data extracted.json

# Try new rules before saving them
docutray types rules test invoice --data extracted.json --rules rules.dsl

# Data straight from a conversion
docutray convert invoice.pdf -t invoice | jq .data | docutray types rules test invoice --data -
```

Piped output is the API response: `valid`, `issues` (each with `field`, `code`,
`message`, `severity` and `source`) and the `errors`/`warnings` summaries. Issue
messages are written in Spanish by the API.

### Saving the rules

```bash
docutray types rules set invoice rules.dsl    # from a file
cat rules.dsl | docutray types rules set invoice -   # from stdin
docutray types rules set invoice --clear      # remove all rules
```

Saving replaces the stored rules. Only your organization's document types can be modified: public platform types can be read with `types rules get` and tested with `types rules test`, but `set` on them fails with 403 or 404. Rules that fail to compile are rejected and
nothing is saved; the error lists the line and column of each problem
(`diagnostics` in piped output):

```json
{
  "error": "<message from the API>",
  "status": 400,
  "diagnostics": [{"line": 2, "column": 7, "message": "..."}]
}
```

## Common workflows

### Find the right type for a document

```bash
# First, identify what type the document is
docutray identify unknown-document.pdf

# Then inspect that type's schema
docutray types get electronic-invoice

# Finally, convert using the right type
docutray convert unknown-document.pdf --type electronic-invoice
```

### Audit available types

```bash
# List all types with details
docutray types list --table --limit 100

# Check if a specific type exists
docutray types get my-custom-type 2>/dev/null && echo "exists" || echo "not found"
```

### Version-control type definitions

```bash
# Export all types to a directory tracked by Git
docutray types list | jq -r '.data[].codeType' | while read code; do
  docutray types export "$code" > "types/${code}.json"
done
git add types/
git commit -m "chore: snapshot document type definitions"
```
