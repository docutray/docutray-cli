## Context

The CLI wraps the DocuTray Node SDK. The SDK already exposes `client.steps.runAsync()` and `client.steps.getStatus()` — the same async-polling pattern used by `convert` and `identify` commands. This change adds two new commands under a `steps` topic following the identical oclif patterns already established.

## Goals / Non-Goals

**Goals:**
- Expose `steps run` and `steps status` via CLI with the same UX patterns as existing commands
- Support file and URL inputs for step execution
- Support async polling with status updates on stderr

**Non-Goals:**
- Steps CRUD (list, get, create, update, delete) — blocked on API endpoints
- Validations, webhooks, or other pending SDK features
- Table output for steps (step results are arbitrary JSON, not tabular)

## Decisions

1. **Follow convert.ts pattern exactly** — `steps run` mirrors the async polling approach from `convert.ts` using `status.wait()` with `onStatus` callback. This keeps the codebase consistent and leverages proven patterns.

2. **Always use async polling for `steps run`** — Unlike `convert` which has both sync and async modes, steps only have `runAsync()` in the SDK. The command will always poll until completion and output the final result.

3. **`steps status` as a simple getter** — Wraps `client.steps.getStatus(executionId)` directly. Returns the raw status object as JSON.

4. **No `--table` flag** — Step execution results contain arbitrary `data` fields that don't map to a consistent table structure. JSON-only output is appropriate here.

## Risks / Trade-offs

- [Long-running steps] → Polling may run for extended time. The SDK's default `maxAttempts: 600` with `interval: 1000ms` caps at ~10 minutes. This is acceptable; users can use `steps status` to check manually if needed.
- [No `--no-wait` flag for now] → All executions poll to completion. If users need fire-and-forget, we can add `--no-wait` later. Keeping it simple for MVP.
