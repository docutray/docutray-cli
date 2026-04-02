## ADDED Requirements

### Requirement: Execute a step on a document
The CLI SHALL provide a `docutray steps run <step-id> <source>` command that executes a processing step on a document file or URL using the SDK's `client.steps.runAsync()` method.

#### Scenario: Run step with a local file
- **WHEN** user runs `docutray steps run my-step invoice.pdf`
- **THEN** the CLI SHALL read the file, call `client.steps.runAsync()` with the file content and filename, poll until completion, and output the final `StepExecutionStatus` as JSON to stdout

#### Scenario: Run step with a URL
- **WHEN** user runs `docutray steps run my-step https://example.com/doc.pdf`
- **THEN** the CLI SHALL call `client.steps.runAsync()` with the URL parameter and output the result as JSON

#### Scenario: Run step with metadata
- **WHEN** user runs `docutray steps run my-step doc.pdf --metadata '{"key":"value"}'`
- **THEN** the CLI SHALL pass the parsed JSON as `documentMetadata` to the SDK

#### Scenario: Run step with webhook URL
- **WHEN** user runs `docutray steps run my-step doc.pdf --webhook-url https://hook.example.com`
- **THEN** the CLI SHALL pass `webhookUrl` to the SDK

#### Scenario: Status updates during polling
- **WHEN** the step is processing and the SDK emits status updates
- **THEN** the CLI SHALL write each status update as JSON to stderr

#### Scenario: Step execution fails
- **WHEN** the SDK throws an error (auth failure, invalid step ID, etc.)
- **THEN** the CLI SHALL output the error as JSON to stderr and exit with code 1

### Requirement: No-wait mode for fire-and-forget execution
The CLI SHALL support a `--no-wait` flag that returns the initial execution status immediately without polling.

#### Scenario: Run step with --no-wait
- **WHEN** user runs `docutray steps run my-step doc.pdf --no-wait`
- **THEN** the CLI SHALL call `client.steps.runAsync()`, output the initial `StepExecutionStatus` (with status ENQUEUED/PROCESSING) as JSON, and exit immediately without polling
