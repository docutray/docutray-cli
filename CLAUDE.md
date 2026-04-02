# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@docutray/cli` es el CLI oficial de DocuTray, construido con TypeScript y oclif. Wrappea el Node SDK `docutray` para exponer operaciones de la API vía terminal. Diseñado principalmente para uso por agentes de IA (Codex, Copilot, Claude Code).

## Essential Commands

### Development
```bash
npm run dev             # Run CLI in development mode
npm run build           # Compile TypeScript
npm run lint            # Lint code
npm run test            # Run tests
```

### Testing the CLI locally
```bash
npm link                # Link globally for testing
docutray status         # Test a command
```

## Architecture

### Tech Stack
- TypeScript + [oclif](https://oclif.io/) framework
- Node SDK `docutray` como dependencia core
- Node.js >= 20

### Project Structure
```
src/
├── commands/           # oclif commands (one file per command)
│   ├── login.ts
│   ├── logout.ts
│   ├── status.ts
│   ├── convert.ts
│   ├── identify.ts
│   └── types/
│       ├── list.ts
│       ├── get.ts
│       ├── create.ts
│       ├── update.ts
│       ├── delete.ts
│       └── export.ts
├── config.ts           # Config file management (~/.config/docutray/)
└── output.ts           # JSON/table formatting helpers
```

### Key Design Decisions
- **JSON output por defecto** — optimizado para agentes de IA, no humanos
- **Sin interactividad** excepto `login` — todo vía flags
- **Exit codes claros** — 0 éxito, 1 error con JSON en stderr
- **Auth**: `DOCUTRAY_API_KEY` env var tiene prioridad sobre config file

## Development Guidelines

### Conventions
- Output siempre en JSON por defecto, `--table` para formato humano
- Nunca usar prompts interactivos (excepto `login`)
- Errores siempre en JSON a stderr
- Reutilizar el SDK `docutray` — no reimplementar lógica de API
- Tests con vitest

### Git
- No push directo a main — crear branch + PR
- Conventional commits en español o inglés
