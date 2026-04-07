`docutray convert`
==================

Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.

* [`docutray convert SOURCE`](#docutray-convert-source)

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

_See code: [src/commands/convert.ts](https://github.com/docutray/docutray-cli/blob/v0.1.2/src/commands/convert.ts)_
