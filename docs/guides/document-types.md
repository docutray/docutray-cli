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
