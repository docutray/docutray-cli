`docutray convert`
==================

Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.

* [`docutray convert SOURCE`](#docutray-convert-source)
* [`docutray convert status CONVERSION-ID`](#docutray-convert-status-conversion-id)

## `docutray convert SOURCE`

Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.

```
USAGE
  $ docutray convert SOURCE -t <value> [--async] [--json] [--metadata <value>] [--timeout <value>]

ARGUMENTS
  SOURCE  File path or URL to convert

FLAGS
  -t, --type=<value>      (required) Document type code to use for extraction (see: docutray types list)
      --async             Use async processing with polling (default: false). Status updates are emitted to stderr.
      --json              Output as JSON (default when piped)
      --metadata=<value>  JSON metadata to attach to the conversion (e.g. '{"key":"value"}')
      --timeout=<value>   [default: 300] Polling timeout in seconds for async processing

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

  Async with 10-minute timeout for large documents

    $ docutray convert large-doc.pdf -t electronic-invoice --async --timeout 600

  Attach custom metadata to the conversion

    $ docutray convert invoice.pdf -t electronic-invoice --metadata '{"ref":"order-123"}'

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/convert
```

_See code: [src/commands/convert.ts](https://github.com/docutray/docutray-cli/blob/v0.5.1/src/commands/convert.ts)_

## `docutray convert status CONVERSION-ID`

Query the status of a conversion by its conversion ID. Use this to check on a conversion started with --async after a timeout, or to retrieve its result later. Returns the conversion status, the extracted data and its validation against the document type's JSON Schema and DSL rules when complete.

```
USAGE
  $ docutray convert:status CONVERSION-ID [--json]

ARGUMENTS
  CONVERSION-ID  Conversion ID returned by "convert --async"

FLAGS
  --json  Output as JSON (default when piped)

DESCRIPTION
  Query the status of a conversion by its conversion ID. Use this to check on a conversion started with --async after a
  timeout, or to retrieve its result later. Returns the conversion status, the extracted data and its validation against
  the document type's JSON Schema and DSL rules when complete.

EXAMPLES
  Check the status of a conversion

    $ docutray convert status conv_abc123

  Output as JSON

    $ docutray convert status conv_abc123 --json

  Show only the validation of the extracted data

    $ docutray convert status conv_abc123 | jq .validation

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/convert/status
```

_See code: [src/commands/convert/status.ts](https://github.com/docutray/docutray-cli/blob/v0.5.1/src/commands/convert/status.ts)_
