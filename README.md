# @docutray/cli

CLI oficial de [DocuTray](https://docutray.com) — plataforma de procesamiento de documentos con OCR impulsado por IA.

Diseñado para ser utilizado por agentes de IA (Codex, Copilot, Claude Code) para interactuar con la API de DocuTray de forma programática.

## Instalación

```bash
npm install -g @docutray/cli
```

O ejecución directa sin instalar:

```bash
npx @docutray/cli <command>
```

## Quickstart

```bash
# Configurar API key
docutray login

# Listar tipos de documentos disponibles
docutray types list

# Convertir un documento
docutray convert invoice.pdf --type electronic-invoice

# Identificar tipo de documento automáticamente
docutray identify document.pdf
```

## Comandos

### Autenticación

| Comando | Descripción |
|---------|-------------|
| `docutray login` | Configurar API key |
| `docutray logout` | Limpiar credenciales |
| `docutray status` | Mostrar cuenta actual y API key (masked) |

### Document Types

| Comando | Descripción |
|---------|-------------|
| `docutray types list` | Listar tipos disponibles |
| `docutray types get <code>` | Detalle de un tipo |
| `docutray types create` | Crear tipo desde JSON |
| `docutray types update <code>` | Actualizar tipo |
| `docutray types delete <code>` | Eliminar tipo |
| `docutray types export <code>` | Exportar tipo a JSON |

### Procesamiento

| Comando | Descripción |
|---------|-------------|
| `docutray convert <file> --type <code>` | Convertir documento |
| `docutray identify <file>` | Identificar tipo de documento |

## Autenticación

El CLI busca la API key en este orden:

1. Variable de entorno `DOCUTRAY_API_KEY` (recomendado para CI/agentes)
2. Archivo de configuración `~/.config/docutray/config.json` (via `docutray login`)

## Output

- **JSON por defecto** — optimizado para consumo por agentes de IA
- `--table` — formato tabla para uso humano
- Exit code `0` en éxito, `1` en error (con error en JSON en stderr)

## Desarrollo

```bash
git clone https://github.com/docutray/docutray-cli.git
cd docutray-cli
npm install
npm run build
npm link
```

## Links

- [Documentación API](https://docs.docutray.com)
- [Node SDK](https://www.npmjs.com/package/docutray)
- [Dashboard](https://app.docutray.com)
