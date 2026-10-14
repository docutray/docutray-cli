# Tasks

## 1. Authorize URL

- [x] 1.1 En `src/oauth.ts` `buildAuthorizeUrl`, cambiar `scope=openid` por `scope=openid%20docutray:cli` y agregar `prompt=consent`; verificar con `test/oauth.test.ts` que `scope` decodifica a `openid docutray:cli`, que `prompt` es `consent` y que `redirect_uri` sigue sin codificar

## 2. Login command

- [x] 2.1 En `src/commands/login.ts`, reemplazar el comentario `future: prompt user to choose` por la explicación del atado en el servidor y reformular el aviso de varias organizaciones; verificar con tests en `test/commands/login.test.ts` que una sola organización no produce aviso y que varias producen el aviso con el nombre de la usada
- [x] 2.2 Agregar un test en `test/commands/login.test.ts` para un callback con `invalid_scope`: exit no cero, el error aparece en stderr y no se escribe la config

## 3. Docs y verificación

- [x] 3.1 Agregar la entrada `Unreleased` en `CHANGELOG.md` (Fixed + nota de compatibilidad con el servidor) y verificar que `npm run docs:generate` no produce diff en `docs/commands/` (la ayuda no cambia)
- [x] 3.2 Correr `npm run build` y `npm run test`; verificar que toda la suite pasa, incluido `test/help.test.ts`

## Workflow follow-up

- Abrir PR a `main`. No mergear ni publicar release sin el OK del usuario y sin la web en producción.
- Archivar el change después del release.
