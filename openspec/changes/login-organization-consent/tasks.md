# Tasks

## 1. Authorize URL

- [x] 1.1 En `src/oauth.ts` `buildAuthorizeUrl`, cambiar `scope=openid` por `scope=openid%20docutray:cli` y agregar `prompt=consent`; verificar con `test/oauth.test.ts` que `scope` decodifica a `openid docutray:cli`, que `prompt` es `consent` y que `redirect_uri` sigue sin codificar

## 2. Login command

- [x] 2.1 En `src/commands/login.ts`, reemplazar el comentario `future: prompt user to choose` por la explicación del atado en el servidor y reformular el aviso de varias organizaciones; verificar con tests en `test/commands/login.test.ts` que una sola organización no produce aviso y que varias producen el aviso con el nombre de la usada
- [x] 2.2 Agregar un test en `test/commands/login.test.ts` para un callback con `invalid_scope`: exit no cero, el error aparece en stderr y no se escribe la config (con y sin `--base-url`; ver 5.2)

## 3. Docs y verificación

- [x] 3.1 Agregar la entrada `Unreleased` en `CHANGELOG.md` (Fixed + nota de compatibilidad con el servidor) y verificar que `npm run docs:generate` no produce diff en `docs/commands/` (la ayuda no cambia)
- [x] 3.2 Correr `npm run build` y `npm run test`; verificar que toda la suite pasa, incluido `test/help.test.ts`

## 4. Ajustes de revisión

- [x] 4.1 Mostrar `OAuth error (<code>): <description>` en el callback y, para `invalid_scope`, sugerir `docutray login --api-key`; verificar con `test/oauth.test.ts` contra el servidor de callback real
- [x] 4.2 Mostrar tal cual el campo `error` del body cuando fallan `organizations` o `create-api-key` (p. ej. el 401 de membresía perdida); verificar con `test/oauth.test.ts`
- [x] 4.3 Igualar el timeout del login interactivo a 180s (`--oauth`); verificar en `test/commands/login.test.ts`
- [x] 4.4 Integrar los tests duplicados en los existentes y corregir el CHANGELOG; verificar con `npm run test`

## 5. Segunda revisión

- [x] 5.1 Errores de `token`, `organizations` y `create-api-key` con paso, mensaje del servidor (`error` + `error_description`) y `statusCode`/`body` para `outputError`; verificar en `test/oauth.test.ts` y con el status en el JSON de stderr en `test/commands/login.test.ts`
- [x] 5.2 Mover el hint de `invalid_scope` a `login.ts` con `--base-url` cuando corresponde, sin doble punto; verificar con el test parametrizado de `test/commands/login.test.ts`
- [x] 5.3 Quitar caracteres de control de los parámetros de error del callback; verificar en `test/oauth.test.ts`
- [x] 5.4 Un solo timeout por defecto (`DEFAULT_OAUTH_TIMEOUT_MS`, 180s) compartido por `oauth.ts` y `login.ts`; verificar con `npm run test`
- [x] 5.5 Actualizar design.md (sección de errores) y la spec; verificar con `openspec validate --strict`

## Workflow follow-up

- Abrir PR a `main`. No mergear ni publicar release sin el OK del usuario y sin la web en producción.
- Archivar el change después del release.
