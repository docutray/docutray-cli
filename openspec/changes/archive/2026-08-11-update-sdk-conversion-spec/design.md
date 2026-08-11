## Context

Ver `proposal.md` — Why. Estado relevante para el diseño:

- `src/parse-schema.ts` ya resuelve el patrón "valor de flag = ruta de archivo o JSON inline" y ya desenvuelve payloads completos de `types export` para sacar `jsonSchema` (PR #35). El nuevo flag necesita exactamente el mismo mecanismo con otra clave, así que el punto de diseño es cómo compartirlo sin duplicar.
- `docutray@0.1.5` aporta los tipos `ConversionSpec`, `LegacyConversionSpec`, `MultiSheetConversionSpec`, `ConversionSpecColumn`, `ConversionSpecSheet` y el type guard `isMultiSheetConversionSpec()`. Los params de create/update aceptan `ConversionSpec | null`. La capa de recursos del SDK reenvía verbatim: no hay lógica de API que replicar.
- `outputKeyValue(data, entries)` imprime las entradas sólo en TTY; en pipe emite `data` sin tocar. Añadir una entrada de resumen no puede alterar la salida JSON.
- Los tests mockean `node:fs` completo (`existsSync`, `readFileSync`) — el parser nuevo debe usar esas mismas dos funciones para seguir siendo testeable con el patrón existente.

## Goals / Non-Goals

**Goals:**
- Superficie de flags mínima y simétrica entre `create` y `update`.
- Un único camino de parseo para "archivo o JSON inline", compartido entre `--schema` y `--conversion-spec`.
- Usar los tipos del SDK como contrato; cero validación semántica propia.
- Round-trip `export → create` fiel sin flags extra.

**Non-Goals:**
- No se valida la forma interna del spec (JSONPath, unicidad de nombres de hoja, coherencia `type`/`formula`): eso lo hace la API y duplicarlo genera drift. Sólo se comprueba que sea un objeto con `columns` o `sheets`.
- No se añaden flags para editar columnas sueltas (`--add-column`, etc.): el spec se envía completo.
- No se toca `types list` (la API no devuelve `conversionSpec` en listados) ni `convert`.
- No se añade un comando nuevo tipo `types conversion-spec`.

## Decisions

### 1. Un cargador compartido en `src/parse-schema.ts`, no un módulo nuevo

Se extrae de `parseSchema()` un helper interno `loadJson(input, label)` que resuelve archivo-vs-inline y produce errores con el nombre del flag correcto, y sobre él se construyen dos funciones exportadas:

- `parseSchema(input)` — sin cambios de comportamiento observable.
- `parseSchemaPayload(input)` → `{jsonSchema, conversionSpec?}` — usada por `create`, devuelve además el `conversionSpec` embebido cuando el input era un export completo.
- `parseConversionSpec(input)` — acepta el spec suelto o un export completo (desenvuelve `.conversionSpec`), valida que sea objeto con `columns` o `sheets`.

*Alternativa descartada:* un `src/parse-conversion-spec.ts` separado. Duplicaría la lógica archivo-vs-inline y los mensajes de error; el archivo actual tiene ~50 líneas y absorbe esto sin volverse pesado.

*Alternativa descartada:* generalizar a `parseJsonFlag(input, key)` totalmente genérico. Los mensajes de error dejarían de ser específicos ("JSON schema must be an object" vs "conversion spec must have columns or sheets"), que es justo el valor del helper.

### 2. `create` arrastra el conversionSpec del `--schema`; `update` no

`create` construye un tipo desde cero: reproducir el export completo es lo que el usuario espera y es la continuación natural de #35. `update` es parcial por contrato — sólo modifica los campos cuyos flags se pasaron —, así que arrastrar un `conversionSpec` embebido en un archivo de schema sería un efecto secundario silencioso sobre un campo que el usuario no nombró. Asimetría deliberada, documentada en el `--help` de ambos comandos.

### 3. `--no-conversion-spec` como flag booleano propio, no `allowNo`

`--conversion-spec` es un flag string, y `allowNo` sólo existe en flags booleanos, así que la variante negativa se declara como un boolean independiente `'no-conversion-spec'` con `exclusive: ['conversion-spec']` (y el recíproco). Se mapea a `conversionSpec: null`, que es como la API limpia el campo.

*Alternativa descartada:* aceptar `--conversion-spec null`. Ambiguo (un archivo podría llamarse `null`) y no se descubre leyendo `--help`.

### 4. El resumen humano usa el type guard del SDK

`types get` añade una entrada `Export spec` calculada con `isMultiSheetConversionSpec()`: `N sheets, M columns` (suma de columnas de todas las hojas), `N columns` para el formato legacy, `(none)` si es `null`/ausente. Va sólo por la rama TTY de `outputKeyValue`; el objeto pasado como `data` sigue siendo el `result` del SDK sin modificar, así que la salida JSON y la de `types export` quedan byte-idénticas salvo por lo que ya devolvía la API.

*Alternativa descartada:* mostrar el spec completo en TTY. Un spec de 14 columnas inunda la salida key-value; quien lo quiere entero usa `types export` o `| jq .conversionSpec`.

### 5. `update` cuenta los flags nuevos para "al menos un campo"

La guarda `Object.keys(params).length === 0` sigue funcionando sin cambios: tanto `--conversion-spec` como `--no-conversion-spec` escriben `params.conversionSpec` (objeto o `null`), y `null` es un valor asignado, no una clave ausente. No hace falta lógica especial — sí un test que lo fije.

## Risks / Trade-offs

- **API anterior a [docutray#972](https://github.com/docutray/docutray/pull/972) ignora el campo** → El CLI no puede detectarlo: la API acepta el request y descarta `conversionSpec` sin error. Mitigación: documentar el requisito en el `--help` del flag y en el README; `types get` mostrará `(none)` tras un create/update, lo que hace el fallo visible al inspeccionar.
- **La unión de tipos del SDK es cerrada** → Un campo nuevo de columna/hoja en la API requerirá release del SDK. Mitigación: el CLI parsea a `unknown` y hace un cast al tipo del SDK tras la comprobación mínima de forma, así que un campo desconocido viaja verbatim en runtime aunque no compile como literal. Nada se filtra ni se recorta.
- **Asimetría create/update sobre `--schema`** → Riesgo de sorpresa. Mitigación: descripción explícita en el `--help` de `--schema` en `update` y un ejemplo en `create` que muestre el round-trip.
- **Bump de dependencia** → `0.1.4 → 0.1.5` es aditivo según el PR del SDK. Mitigación: `npm run build` + suite completa de tests; el CI ya corre matriz Node 20/22 y verificación de package.

## Migration Plan

Sin migración: todos los flags son opcionales y ninguna salida existente cambia de forma. Rollback = revertir el commit y volver a `docutray@^0.1.4`; los tipos creados con conversionSpec siguen siendo válidos en la API, sólo dejan de ser editables desde el CLI.
