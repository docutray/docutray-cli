# Design

## Context

`buildAuthorizeUrl` (`src/oauth.ts`) arma la query del authorize a mano, sin URL-encoding, porque better-auth no decodifica `redirect_uri` antes de compararlo con la lista de URLs registradas. Hoy pide `scope=openid`. `loginWithOAuth` (`src/commands/login.ts`) canjea el código, llama a `fetchOrganizations` y usa `organizations[0]`. Si hay más de una, escribe `Multiple organizations found, using: …` en stderr.

Del lado servidor (repo `docutray`, change `cli-login-organization-consent`), `docutray:cli` existe solo en la fila `docutray-cli` de `oauthClient`. Por su prefijo `docutray:`, activa el selector de `/consent` y ata el token a la organización elegida. Con un token atado, `/api/auth/oauth/organizations` devuelve solo esa organización y `create-api-key` responde 403 a cualquier otra. Better Auth quita `prompt=consent` de la query al volver a autorizar desde `/consent`, así que no hay bucle.

## Goals / Non-Goals

**Goals:**
- Que el authorize del CLI pida el scope y el prompt que activan el selector en cada login.
- Mantener el contrato con `organizations` y `create-api-key` sin cambios en el CLI: el servidor resuelve la organización.

**Non-Goals:**
- Un flag `--org` o un menú TTY para elegir la organización (prototipo descartado: deja la elección fuera del servidor y duplica el selector de la web).
- Ordenar o filtrar en el CLI la respuesta de `organizations` para servidores viejos.
- Fallback automático a `scope=openid` cuando el servidor responde `invalid_scope`. Reintroduciría la elección arbitraria en silencio.
- Cambios en la salida JSON o en las tablas: el resultado de login es el mismo (`organizationId`, `organizationName`).

## Decisions

### 1. Scope con el espacio como `%20` en la query manual

`scope=openid%20docutray:cli`. La query se sigue armando a mano por el problema de `redirect_uri`. El espacio va codificado como `%20`, no como `+`: en query strings `+` también significa espacio para `URLSearchParams`, pero `%20` es lo que no admite ninguna otra lectura. Los `:` del scope son válidos sin codificar en una query.

*Alternativa descartada:* pasar a `URLSearchParams` para toda la query. Codificaría `redirect_uri` y rompería la validación del servidor.

### 2. `prompt=consent` siempre

Sin él, un consentimiento previo para (usuario, organización activa) emite el código sin mostrar pantalla y el usuario no puede cambiar de organización. El costo es un clic por login, con la organización activa preseleccionada.

*Alternativa descartada:* un flag `--choose-org` que agregue el prompt solo a pedido. El caso del bug (el usuario no sabe que hay que elegir) quedaría igual.

### 3. El aviso de varias organizaciones se queda, como señal de servidor inesperado

Contra un servidor viejo el authorize ya falla con `invalid_scope`, así que la lista con más de un elemento solo aparece si el servidor aceptó el scope pero no ató el token (despliegue parcial o regresión). En ese caso conviene que el usuario vea qué organización se usó, en vez de repetir el bug en silencio. El texto pasa a decir que la organización no se eligió en el navegador. El comentario `future: prompt user to choose` se reemplaza por la explicación del atado en el servidor.

*Alternativa descartada:* fallar si llegan varias organizaciones. Bloquearía el login por un problema del servidor que el usuario no puede resolver desde el CLI.

### 4. Errores de OAuth con código, paso y status

La salida de éxito no cambia. Los errores sí, porque `invalid_scope` pasa a ser un error esperable (servidor viejo o staging sin el scope):

- **Callback:** `OAuthCallbackError` arma `OAuth error (<code>): <description>` y expone el código en `oauthError`. Quita caracteres de control de la query, porque cualquier proceso local puede llamar al callback.
- **Hint de `invalid_scope`:** lo agrega `login.ts`, no `oauth.ts`, porque necesita la base URL: un `login` sin `--base-url` la vuelve a producción, así que el hint incluye `--base-url <url>` cuando el login usó una.
- **Endpoints (`token`, `organizations`, `create-api-key`):** el error lleva `statusCode` y `body` para que `outputError` muestre el status (`(401)` en TTY, `status` en JSON piped). El mensaje nombra el paso y usa `error` (más `error_description`) del body JSON, o el body crudo si no es JSON. Así el 401 por membresía perdida en la organización atada se lee directo.

*Alternativa descartada:* devolver solo el `error` del body. Pierde el paso y el status, que los agentes usan para decidir si reintentar.

*Fuera de alcance:* el callback acepta errores sin validar `state` (comportamiento previo a este change). Va en un change aparte.

## Risks / Trade-offs

- [Release del CLI publicado antes del deploy de la web] → `invalid_scope` en cada `login --oauth`. Mitigación: no publicar hasta confirmar la web en producción; el CHANGELOG lo deja como nota de compatibilidad.
- [Staging o self-hosted sin el scope] → mismo error. `--api-key` sigue disponible como alternativa.
- [Pantalla de consentimiento en cada login] → aceptado: el login es una acción explícita y el usuario ya está en el navegador.

## Migration Plan

1. Merge de la web y deploy a producción (repo `docutray`).
2. Merge de este PR y release del CLI (`gh release create`) con el OK explícito del usuario.
3. Rollback: revertir el release (publicar un patch con `scope=openid`) devuelve el comportamiento anterior. Los tokens sin organización siguen funcionando en el servidor.
