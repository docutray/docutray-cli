`docutray types`
================

Manage document types (extraction schemas). Document types define the fields and structure that DocuTray extracts from documents during conversion.

* [`docutray types export CODE`](#docutray-types-export-code)
* [`docutray types get CODE`](#docutray-types-get-code)
* [`docutray types list`](#docutray-types-list)

## `docutray types export CODE`

Export a document type definition to JSON format. By default, writes to stdout for piping or redirection. Use --output to write directly to a file. Useful for backing up type definitions, version-controlling them in Git, or migrating types between environments.

```
USAGE
  $ docutray types:export CODE [-o <value>]

ARGUMENTS
  CODE  Document type code

FLAGS
  -o, --output=<value>  Output file path. If omitted, writes to stdout.

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

## `docutray types get CODE`

Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.

```
USAGE
  $ docutray types:get CODE [--table]

ARGUMENTS
  CODE  Document type code

FLAGS
  --table  Output details as a formatted table instead of JSON

DESCRIPTION
  Get the full details of a document type by its code. Returns the type name, description, field schema, and
  configuration. Use this to inspect a document type before converting documents or to verify type settings.

EXAMPLES
  Get full details of a document type

    $ docutray types get electronic-invoice

  Display details as a formatted table

    $ docutray types get electronic-invoice --table

  Extract just the field schema (useful for scripts)

    $ docutray types get electronic-invoice | jq .fields

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/get
```

## `docutray types list`

List available document types with pagination and search. Document types define the extraction schema used when converting documents. Results are paginated — use --page and --limit to navigate through large result sets. Use --search to filter by name.

```
USAGE
  $ docutray types:list [--limit <value>] [--page <value>] [--search <value>] [--table]

FLAGS
  --limit=<value>   [default: 20] Number of results per page (default: 20)
  --page=<value>    [default: 1] Page number for pagination (default: 1)
  --search=<value>  Filter document types by name (case-insensitive substring match)
  --table           Output results as a formatted table instead of JSON

DESCRIPTION
  List available document types with pagination and search. Document types define the extraction schema used when
  converting documents. Results are paginated — use --page and --limit to navigate through large result sets. Use
  --search to filter by name.

EXAMPLES
  List all document types (first page, default 20 results)

    $ docutray types list

  Search for document types by name

    $ docutray types list --search invoice

  Display results as a formatted table

    $ docutray types list --table

  Paginate through results

    $ docutray types list --limit 50 --page 2

  Extract just the type codes (useful for scripting)

    $ docutray types list | jq ".data[].codeType"

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/list
```
