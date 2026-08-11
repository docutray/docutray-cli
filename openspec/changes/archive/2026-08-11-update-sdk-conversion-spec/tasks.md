## 1. Dependencia del SDK

- [x] 1.1 Bump `docutray` a `^0.1.5` en `package.json` y correr `npm install` para actualizar `package-lock.json`
- [x] 1.2 Verificar con `npm run build` que el proyecto compila contra 0.1.5 sin cambios (bump aditivo)

## 2. Parseo de conversion specs

- [x] 2.1 En `src/parse-schema.ts`, extraer un helper interno `loadJson(input, label)` que resuelva archivo-vs-inline y produzca errores con el nombre del flag; reescribir `parseSchema()` sobre él sin cambiar su comportamiento observable
- [x] 2.2 Añadir `parseConversionSpec(input)`: usa `loadJson`, desenvuelve `.conversionSpec` si el payload es un export completo, y valida forma mínima (objeto no-array con `columns` o `sheets`), devolviendo el tipo `ConversionSpec` del SDK
- [x] 2.3 Añadir `parseSchemaPayload(input)` → `{jsonSchema, conversionSpec?}`: mismo desenvuelto que `parseSchema` pero devolviendo también el `conversionSpec` embebido cuando existe y no es `null`
- [x] 2.4 Tests de parser en `test/parse-schema.test.ts`: spec inline, spec desde archivo (legacy y multi-sheet), export completo, `conversionSpec: null` en el export, JSON inválido, array/escalar, objeto sin `columns` ni `sheets`, y no-regresión de `parseSchema`

## 3. `types create`

- [x] 3.1 Añadir el flag `--conversion-spec <file|json>` con descripción que mencione los tres formatos aceptados y el requisito de despliegue de API
- [x] 3.2 Cambiar el uso de `parseSchema` por `parseSchemaPayload` y enviar `conversionSpec` sólo cuando venga del flag (prioridad) o del payload embebido; omitir la clave si no hay ninguno
- [x] 3.3 Añadir un ejemplo de round-trip `types export → types create` en `static examples`
- [x] 3.4 Tests en `test/commands/types/create.test.ts`: spec inline, spec desde archivo, export completo vía `--schema`, precedencia del flag sobre el embebido, export sin spec (clave ausente), y error de spec inválido sin llamada a la API

## 4. `types update`

- [x] 4.1 Añadir los flags `--conversion-spec <file|json>` y `--no-conversion-spec`, mutuamente excluyentes vía `exclusive`
- [x] 4.2 Mapear `--conversion-spec` a `params.conversionSpec` (spec parseado) y `--no-conversion-spec` a `params.conversionSpec = null`; dejar `--schema` usando `parseSchema` (sin arrastre) y documentar la asimetría en la descripción del flag
- [x] 4.3 Tests en `test/commands/types/update.test.ts`: set del spec, clear con `null`, cualquiera de los dos flags satisface "at least one field", y `--schema` con export completo no envía `conversionSpec`

## 5. Salida de `types get`

- [x] 5.1 Añadir un helper `describeConversionSpec()` en `src/commands/types/get.ts` usando `isMultiSheetConversionSpec()` del SDK: `N sheets, M columns`, `N columns`, o `(none)`
- [x] 5.2 Añadir la entrada `Export spec` a `outputKeyValue` en `types get`, sin tocar el objeto pasado como `data`
- [x] 5.3 Tests en `test/commands/types/get.test.ts`: resumen legacy, resumen multi-sheet, spec ausente/`null`, y salida JSON en pipe sin campos derivados

## 6. Verificación y documentación

- [x] 6.1 Correr `npm run test` y `npm run build` — todo verde
- [x] 6.2 Actualizar la sección de `types create`/`update` en `README.md` con el flag nuevo, la semántica de `--no-conversion-spec` y el requisito de despliegue de API
- [x] 6.3 Regenerar la referencia de comandos con `npm run docs:generate`
- [ ] 6.4 Prueba manual contra la API real: `types export` de un tipo con spec → `types create` de una copia → `types get` de la copia muestra el mismo resumen → `types update --no-conversion-spec` lo limpia
