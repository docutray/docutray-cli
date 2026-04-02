## Why

The CLI currently supports document conversion and identification but lacks step execution commands. Steps are a core SDK capability (`client.steps.runAsync()`, `client.steps.getStatus()`) that allow running individual processing steps on documents. Adding these commands extends the CLI to cover all currently available SDK operations. Ref: #3, migrated from docutray/docutray#628.

## What Changes

- Add `docutray steps run <step-id> <source>` command that executes a step asynchronously with polling until completion
- Add `docutray steps status <execution-id>` command to query the status of a step execution
- Register `steps` as a new oclif topic

## Capabilities

### New Capabilities
- `steps-run`: Execute a processing step on a document (file or URL) with async polling, supporting metadata, webhook URL, and wait options
- `steps-status`: Query the execution status of a previously submitted step by execution ID

### Modified Capabilities

## Impact

- New files: `src/commands/steps/run.ts`, `src/commands/steps/status.ts`
- `package.json`: Add `steps` topic to oclif config
- Uses existing SDK methods `client.steps.runAsync()` and `client.steps.getStatus()` — no new API logic
