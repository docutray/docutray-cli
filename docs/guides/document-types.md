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

# Update multiple fields at once
docutray types update invoice \
  --name "Commercial Invoice v2" \
  --description "Updated extraction schema" \
  --schema updated-schema.json \
  --prompt-hints "Extract amounts in USD"
```

Note: the `codeType` identifier cannot be changed after creation.

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
