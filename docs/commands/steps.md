`docutray steps`
================

Execute and monitor document processing steps. Steps are reusable processing pipelines that can be applied to documents for extraction, transformation, and validation.

* [`docutray steps run STEP-ID SOURCE`](#docutray-steps-run-step-id-source)
* [`docutray steps status EXECUTION-ID`](#docutray-steps-status-execution-id)

## `docutray steps run STEP-ID SOURCE`

Execute a processing step on a document. Steps are reusable processing pipelines configured in the DocuTray dashboard. By default, the command waits for the step to complete and returns the result. Use --no-wait to return the execution status immediately without polling. Accepts a local file path or a public URL as the document source.

```
USAGE
  $ docutray steps:run STEP-ID SOURCE [--metadata <value>] [--no-wait] [--webhook-url <value>]

ARGUMENTS
  STEP-ID  Step ID to execute
  SOURCE   File path or URL to process

FLAGS
  --metadata=<value>     JSON metadata to attach to the execution (e.g. '{"key":"value"}')
  --no-wait              Return immediately with execution status instead of waiting for completion (default: false)
  --webhook-url=<value>  Webhook URL to receive a POST notification when the step completes

DESCRIPTION
  Execute a processing step on a document. Steps are reusable processing pipelines configured in the DocuTray dashboard.
  By default, the command waits for the step to complete and returns the result. Use --no-wait to return the execution
  status immediately without polling. Accepts a local file path or a public URL as the document source.

EXAMPLES
  Run a step on a local file and wait for results

    $ docutray steps run extract-fields invoice.pdf

  Run a step on a document URL

    $ docutray steps run extract-fields https://example.com/doc.pdf

  Start execution and return immediately (async)

    $ docutray steps run extract-fields invoice.pdf --no-wait

  Attach custom metadata to the execution

    $ docutray steps run extract-fields invoice.pdf --metadata '{"ref":"order-123"}'

  Receive a webhook notification on completion

    $ docutray steps run extract-fields invoice.pdf --webhook-url https://example.com/hook

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/steps/run
```

## `docutray steps status EXECUTION-ID`

Query the current status of a step execution by its execution ID. Use this to check progress on executions started with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress, and result data when complete.

```
USAGE
  $ docutray steps:status EXECUTION-ID

ARGUMENTS
  EXECUTION-ID  Step execution ID to query

DESCRIPTION
  Query the current status of a step execution by its execution ID. Use this to check progress on executions started
  with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress,
  and result data when complete.

EXAMPLES
  Check the status of an execution

    $ docutray steps status exec_abc123

  Extract just the status field (useful for scripts)

    $ docutray steps status exec_abc123 | jq .status

  Start async execution then check its status

    $ docutray steps run my-step doc.pdf --no-wait | jq -r .id | xargs docutray steps status

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/steps/status
```
