`docutray types`
================

Manage document types (extraction schemas). Document types define the fields and structure that DocuTray extracts from documents during conversion.

* [`docutray types create`](#docutray-types-create)
* [`docutray types export CODE`](#docutray-types-export-code)
* [`docutray types get CODE`](#docutray-types-get-code)
* [`docutray types list`](#docutray-types-list)
* [`docutray types update CODE`](#docutray-types-update-code)

## `docutray types create`

Create a new document type. Defines an extraction schema that DocuTray uses when converting documents. Requires a name, code, description, and JSON schema. The schema can be provided as a file path or inline JSON string.

```
USAGE
  $ docutray types:create --code <value> --description <value> --name <value> --schema <value> [--conversion-mode
    json|toon|multi_prompt] [--identify-hints <value>] [--json] [--keep-ordering] [--prompt-hints <value>] [--publish |
    --draft]

FLAGS
  --code=<value>              (required) Unique code identifier (lowercase, numbers, underscores)
  --conversion-mode=<option>  Conversion mode
                              <options: json|toon|multi_prompt>
  --description=<value>       (required) Description of the document type
  --[no-]draft                Create as draft (default: true)
  --identify-hints=<value>    Hints for automatic document identification
  --json                      Output as JSON (default when piped)
  --keep-ordering             Preserve property ordering in extraction output
  --name=<value>              (required) Document type name
  --prompt-hints=<value>      General extraction prompt hints
  --publish                   Publish immediately (equivalent to --no-draft)
  --schema=<value>            (required) JSON schema: file path or inline JSON string

DESCRIPTION
  Create a new document type. Defines an extraction schema that DocuTray uses when converting documents. Requires a
  name, code, description, and JSON schema. The schema can be provided as a file path or inline JSON string.

EXAMPLES
  Create from a schema file

    $ docutray types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json

  Create with inline JSON schema

    $ docutray types create --name "Invoice" --code invoice --description "Standard invoice" --schema \
      '{"type":"object","properties":{"total":{"type":"number"}}}'

  Create and publish immediately

    $ docutray types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json \
      --publish

  Create with a specific conversion mode

    $ docutray types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json \
      --conversion-mode toon

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/create
```

_See code: [src/commands/types/create.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/types/create.ts)_

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

_See code: [src/commands/types/export.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/types/export.ts)_

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

_See code: [src/commands/types/get.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/types/get.ts)_

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

_See code: [src/commands/types/list.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/types/list.ts)_

## `docutray types update CODE`

Update an existing document type. Allows modifying name, description, schema, prompt hints, and other settings. At least one field to update must be provided. The code identifier cannot be changed.

```
USAGE
  $ docutray types:update CODE [--conversion-mode json|toon|multi_prompt] [--description <value>]
    [--identify-hints <value>] [--json] [--keep-ordering] [--name <value>] [--prompt-hints <value>] [--publish |
    --draft] [--schema <value>]

ARGUMENTS
  CODE  Document type code to update

FLAGS
  --conversion-mode=<option>  Conversion mode
                              <options: json|toon|multi_prompt>
  --description=<value>       New description
  --[no-]draft                Set draft status
  --identify-hints=<value>    Hints for automatic document identification
  --json                      Output as JSON (default when piped)
  --[no-]keep-ordering        Preserve property ordering in extraction output
  --name=<value>              New name
  --prompt-hints=<value>      General extraction prompt hints
  --publish                   Publish immediately (sets draft to false)
  --schema=<value>            New JSON schema: file path or inline JSON string

DESCRIPTION
  Update an existing document type. Allows modifying name, description, schema, prompt hints, and other settings. At
  least one field to update must be provided. The code identifier cannot be changed.

EXAMPLES
  Update the name

    $ docutray types update invoice --name "Updated Invoice"

  Update the schema from a file

    $ docutray types update invoice --schema new-schema.json

  Update prompt hints

    $ docutray types update invoice --prompt-hints "Use dd/mm/yyyy for dates"

  Publish a draft type

    $ docutray types update invoice --publish

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/types/update
```

_See code: [src/commands/types/update.ts](https://github.com/docutray/docutray-cli/blob/v0.2.1/src/commands/types/update.ts)_
