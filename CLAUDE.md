# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@docutray/cli` es el CLI oficial de DocuTray, construido con TypeScript y oclif. Wrappea el Node SDK `docutray` para exponer operaciones de la API vía terminal. Diseñado principalmente para uso por agentes de IA (Codex, Copilot, Claude Code).

## Essential Commands

```bash
npm run build           # Compile TypeScript
npm run dev             # Run CLI in development mode (ts-node)
npm run test            # Run tests (vitest run)
npm run test:watch      # Run tests in watch mode
npm run lint            # Lint code
npm run docs:generate   # Generate CLI command reference docs
```

### Running a single test
```bash
npx vitest run test/commands/steps/run.test.ts
```

### Testing the CLI locally
```bash
npm link                # Link globally
docutray status         # Test a command
```

## Architecture

- **TypeScript 5** + **oclif 4** framework, targeting ES2022 / Node.js >= 20
- **Node SDK `docutray`** as the sole API layer — CLI never calls the API directly
- **vitest 3** for testing

### How commands work

Each file in `src/commands/` is an oclif Command class. oclif auto-discovers commands from the compiled `dist/commands/` directory. Topic subcommands live in subdirectories (`types/`, `steps/`).

All commands follow the same pattern:
1. Get a `DocuTray` client via `createClient()` (from `src/client.ts`) — checks `DOCUTRAY_API_KEY` env var first, then `~/.config/docutray/config.json`
2. Call the SDK method (e.g., `client.convert.run()`, `client.steps.runAsync()`)
3. Output result via `outputJson()` to stdout or `outputError()` to stderr (from `src/output.ts`)

### Key shared modules

- **`src/client.ts`** — Factory that creates a `DocuTray` SDK instance from env/config credentials
- **`src/config.ts`** — Manages `~/.config/docutray/config.json` (read/write/delete, file perms 0o600)
- **`src/output.ts`** — `outputJson()`, `outputError()`, `outputTable()` helpers
- **`src/help.ts`** — Custom oclif help class that appends "Learn more" doc links to each command

### Async pattern

Commands with `--async` flag use SDK's `.runAsync()` which returns an object with `.wait({onStatus})`. Status updates are emitted to stderr during polling; final result goes to stdout as JSON.

## Development Guidelines

### Conventions
- Output siempre en JSON por defecto, `--table` para formato humano
- Nunca usar prompts interactivos (excepto `login`)
- Errores siempre en JSON a stderr
- Reutilizar el SDK `docutray` — no reimplementar lógica de API

### Testing pattern
Tests mock `createClient` and spy on `process.stdout/stderr.write` to capture output. Commands are invoked via their static `.run()` method:
```typescript
vi.mock('../../../src/client.js', () => ({createClient: vi.fn()}))
await StepsRun.run(['step-id', 'file.pdf', '--no-wait'])
```

### Git
- No push directo a main — crear branch + PR
- Conventional commits en español o inglés
