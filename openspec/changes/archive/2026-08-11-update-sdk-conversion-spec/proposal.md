## Why

El SDK `docutray@0.1.5` ([docutray-node#24](https://github.com/docutray/docutray-node/pull/24)) expone `conversionSpec` — el mapeo JSON → columnas CSV/Excel que usa el export de tray — en `DocumentType`, `DocumentTypeCreateParams` y `DocumentTypeUpdateParams`. El CLI sigue pineado a `^0.1.4`, así que hoy no hay forma de enviar un conversionSpec desde la terminal y el round-trip `types export → types create` (arreglado en #35) pierde silenciosamente el mapeo de exportación: el tipo recreado extrae los mismos campos pero ya no exporta a la misma planilla.

## What Changes

- Bump de la dependencia `docutray` a `^0.1.5`.
- **`types create`**: nuevo flag `--conversion-spec <file|json>` que acepta un spec inline, un archivo con el spec suelto (`{columns}` o `{sheets}`), o un payload completo de `types export` (del que se extrae `conversionSpec`).
- **`types create --schema <export.json>`**: cuando el archivo es un payload completo de `types export`, el `conversionSpec` embebido se envía junto al `jsonSchema`. `--conversion-spec` explícito tiene prioridad. Completa el round-trip export → create iniciado en #35.
- **`types update`**: mismo flag `--conversion-spec`, más `--no-conversion-spec` para limpiar el spec existente (envía `conversionSpec: null`). Ambos son mutuamente excluyentes. `--schema <export.json>` **no** arrastra el conversionSpec en update — un update es parcial por definición y arrastrarlo modificaría un campo que el usuario no pidió tocar.
- **`types get` / `types export`**: la salida humana añade una línea `Export spec` con un resumen (`2 sheets, 14 columns` / `(none)`). La salida JSON no cambia — ya emitía el campo verbatim, ahora además está tipado.
- Sin breaking changes: todos los flags son opcionales y la salida JSON existente se mantiene.

## Capabilities

### New Capabilities
- `document-type-conversion-spec`: leer, enviar y limpiar el conversionSpec de un document type desde el CLI, incluyendo su preservación en el round-trip export → create.

### Modified Capabilities
<!-- Ninguna: no existe spec previo para los comandos `types` en openspec/specs/. -->

## Impact

- **Dependencias**: `docutray` `^0.1.4` → `^0.1.5` en `package.json` (+ `package-lock.json`). Requiere un despliegue de la API con [docutray#972](https://github.com/docutray/docutray/pull/972); contra un backend anterior el campo se ignora.
- **Código**: `src/commands/types/create.ts`, `src/commands/types/update.ts`, `src/commands/types/get.ts`, `src/parse-schema.ts` (nuevo parser de conversion spec).
- **Tests**: `test/commands/types/{create,update,get}.test.ts` y tests del nuevo parser.
- **Docs**: `README.md` y `docs/commands/` regenerados vía `npm run docs:generate`.
