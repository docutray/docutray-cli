`docutray identify`
===================

Identify the type of a document by analyzing its content. Returns the best-matching document type along with alternative matches ranked by confidence score. Use --types to restrict identification to a specific set of document types. Accepts a local file path or a public URL.

* [`docutray identify SOURCE`](#docutray-identify-source)

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

_See code: [src/commands/identify.ts](https://github.com/docutray/docutray-cli/blob/v0.1.2/src/commands/identify.ts)_
