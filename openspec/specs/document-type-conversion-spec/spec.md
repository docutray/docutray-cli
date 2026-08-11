# document-type-conversion-spec Specification

## Purpose
Permite leer, enviar y limpiar el `conversionSpec` de un document type desde el CLI — el mapeo de JSON extraído a columnas CSV/Excel que usa el export de tray — y preservarlo íntegro en el round-trip `types export` → `types create`.
## Requirements
### Requirement: Enviar un conversion spec al crear un document type
El CLI SHALL aceptar un flag `--conversion-spec <file|json>` en `docutray types create` y enviar su contenido como `conversionSpec` en los parámetros de creación. El valor SHALL aceptarse como JSON inline, como ruta a un archivo con el spec suelto (`{"columns": [...]}` o `{"sheets": [...]}`), o como ruta a un payload completo de `types export` (del que se extrae la clave `conversionSpec`). El CLI SHALL NOT validar la forma interna del spec más allá de exigir que sea un objeto JSON con `columns` o `sheets`: la API es la fuente de verdad.

#### Scenario: Crear con un spec inline
- **WHEN** el usuario ejecuta `docutray types create --name X --code x --description D --schema s.json --conversion-spec '{"columns":[{"header":"Total","jsonPath":"$.total"}]}'`
- **THEN** el CLI SHALL llamar a `documentTypes.create()` con `conversionSpec` igual al objeto parseado, verbatim

#### Scenario: Crear con un spec multi-hoja desde archivo
- **WHEN** el usuario ejecuta `docutray types create ... --conversion-spec spec.json` y `spec.json` contiene `{"sheets":[{"name":"Items","columns":[...]}]}`
- **THEN** el CLI SHALL enviar ese objeto como `conversionSpec` verbatim

#### Scenario: Crear apuntando el flag a un export completo
- **WHEN** el usuario ejecuta `docutray types create ... --conversion-spec factura.json` y `factura.json` es un payload de `types export` con clave `conversionSpec`
- **THEN** el CLI SHALL extraer el valor de `conversionSpec` y enviarlo como `conversionSpec`

#### Scenario: Sin el flag no se envía la clave
- **WHEN** el usuario ejecuta `docutray types create` sin `--conversion-spec` y sin un `--schema` que contenga un conversionSpec embebido
- **THEN** el CLI SHALL NOT incluir la clave `conversionSpec` en los parámetros enviados a la API

#### Scenario: Valor no parseable
- **WHEN** el valor de `--conversion-spec` no es una ruta existente ni JSON válido
- **THEN** el CLI SHALL fallar con un error que identifique el flag `--conversion-spec`, sin llamar a la API, y salir con código 1

#### Scenario: JSON válido con forma inválida
- **WHEN** el valor de `--conversion-spec` parsea a un array, a un escalar, o a un objeto sin `columns` ni `sheets`
- **THEN** el CLI SHALL fallar con un error que explique que se espera un objeto con `columns` o `sheets`, sin llamar a la API, y salir con código 1

### Requirement: Preservar el conversion spec en el round-trip export → create
Cuando el valor de `--schema` en `docutray types create` es un payload completo de `types export`, el CLI SHALL enviar también el `conversionSpec` embebido en ese payload, de modo que recrear un tipo exportado reproduzca su mapeo de exportación. Un `--conversion-spec` explícito SHALL tener prioridad sobre el valor embebido.

#### Scenario: Round-trip completo
- **WHEN** el usuario ejecuta `docutray types export factura -o f.json` y luego `docutray types create --name "Copia" --code copia --description D --schema f.json`
- **THEN** el CLI SHALL enviar tanto el `jsonSchema` como el `conversionSpec` presentes en `f.json`

#### Scenario: Export sin conversion spec
- **WHEN** el payload de `--schema` no tiene clave `conversionSpec`, o su valor es `null`
- **THEN** el CLI SHALL NOT incluir la clave `conversionSpec` en los parámetros de creación

#### Scenario: El flag explícito gana
- **WHEN** el usuario pasa un `--schema f.json` con `conversionSpec` embebido y además un `--conversion-spec otro.json`
- **THEN** el CLI SHALL enviar el spec de `--conversion-spec` y descartar el embebido

#### Scenario: Schema suelto sin envoltorio
- **WHEN** el valor de `--schema` es un JSON Schema suelto (sin clave `jsonSchema`)
- **THEN** el comportamiento actual SHALL mantenerse sin cambios: se envía como `jsonSchema` y no se infiere ningún `conversionSpec`

### Requirement: Actualizar y limpiar el conversion spec de un document type
El CLI SHALL aceptar en `docutray types update` un flag `--conversion-spec <file|json>` con la misma semántica de parseo que en `create`, y un flag `--no-conversion-spec` que envía `conversionSpec: null` para limpiar el spec almacenado. Ambos flags SHALL ser mutuamente excluyentes. A diferencia de `create`, un `--schema` que apunte a un export completo SHALL NOT arrastrar el `conversionSpec` embebido, porque un update es parcial y no debe modificar campos que el usuario no pidió tocar.

#### Scenario: Actualizar el spec
- **WHEN** el usuario ejecuta `docutray types update factura --conversion-spec spec.json`
- **THEN** el CLI SHALL llamar a `documentTypes.update()` con `conversionSpec` igual al spec parseado

#### Scenario: Limpiar el spec
- **WHEN** el usuario ejecuta `docutray types update factura --no-conversion-spec`
- **THEN** el CLI SHALL llamar a `documentTypes.update()` con `conversionSpec: null`

#### Scenario: Flags mutuamente excluyentes
- **WHEN** el usuario pasa `--conversion-spec` y `--no-conversion-spec` a la vez
- **THEN** el CLI SHALL rechazar la invocación con un error de flags excluyentes y salir con código distinto de 0

#### Scenario: Cualquiera de los dos flags satisface "al menos un campo"
- **WHEN** el usuario ejecuta `docutray types update factura --conversion-spec spec.json` sin ningún otro flag de actualización
- **THEN** el CLI SHALL NOT fallar con "At least one field to update must be provided"

#### Scenario: Update con schema exportado no toca el spec
- **WHEN** el usuario ejecuta `docutray types update factura --schema export.json` y `export.json` contiene `conversionSpec`
- **THEN** el CLI SHALL enviar sólo `jsonSchema` y SHALL NOT incluir la clave `conversionSpec`

### Requirement: Mostrar el conversion spec al inspeccionar un document type
`docutray types get` SHALL mostrar en su salida humana una línea con un resumen del conversion spec del tipo. La salida JSON de `types get` y `types export` SHALL seguir incluyendo el campo `conversionSpec` tal como lo devuelve la API, sin transformarlo.

#### Scenario: Tipo con spec legacy (columnas)
- **WHEN** el usuario ejecuta `docutray types get factura` en una terminal y el tipo tiene `{"columns":[...]}` con 5 columnas
- **THEN** la salida humana SHALL incluir una línea que resuma el spec indicando 5 columnas

#### Scenario: Tipo con spec multi-hoja
- **WHEN** el tipo tiene `{"sheets":[...]}` con 2 hojas que suman 14 columnas
- **THEN** la salida humana SHALL resumir el spec indicando 2 hojas y 14 columnas

#### Scenario: Tipo sin spec
- **WHEN** el `conversionSpec` del tipo es `null` o está ausente
- **THEN** la salida humana SHALL indicar que no hay spec (`(none)`)

#### Scenario: Salida JSON intacta
- **WHEN** la salida es un pipe o se pasa `--json`
- **THEN** el CLI SHALL emitir el objeto del document type completo, con `conversionSpec` verbatim, sin resúmenes ni campos derivados

