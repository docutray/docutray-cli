## ADDED Requirements

### Requirement: Query step execution status
The CLI SHALL provide a `docutray steps status <execution-id>` command that queries the status of a step execution using `client.steps.getStatus()`.

#### Scenario: Query existing execution
- **WHEN** user runs `docutray steps status abc-123`
- **THEN** the CLI SHALL call `client.steps.getStatus("abc-123")` and output the `StepExecutionStatus` as JSON to stdout

#### Scenario: Query non-existent execution
- **WHEN** user runs `docutray steps status invalid-id` and the SDK returns an error
- **THEN** the CLI SHALL output the error as JSON to stderr and exit with code 1

#### Scenario: No authentication configured
- **WHEN** user runs `docutray steps status abc-123` without a configured API key
- **THEN** the CLI SHALL output an authentication error as JSON to stderr and exit with code 1
