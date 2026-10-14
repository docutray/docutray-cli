# Proposal

## Why

Un usuario con varias organizaciones que corre `docutray login` (OAuth) queda logueado en una organización arbitraria: el CLI pide solo `scope=openid`, así que la pantalla `/consent` de la web no muestra el selector de organización, y después toma `organizations[0]` de `GET /api/auth/oauth/organizations`, que lista las membresías sin orden. La API key queda atada a esa organización. La web (change `cli-login-organization-consent` en el repo `docutray`) agrega un scope exclusivo del CLI, `docutray:cli`, que activa el selector existente y ata el token a la organización elegida; el CLI tiene que pedirlo.

## What Changes

- El authorize del OAuth pide `scope=openid docutray:cli` en lugar de `scope=openid`.
- El authorize agrega `prompt=consent`, para que el selector aparezca en cada login (con la organización activa preseleccionada) aunque ya exista un consentimiento previo.
- El CLI no agrega lógica de selección: con un token atado, el servidor devuelve solo la organización elegida y `organizations[0]` es esa. El aviso `Multiple organizations found, using: …` se mantiene solo como señal de un servidor que no ató el token.
- **BREAKING (despliegue):** contra un servidor sin el scope `docutray:cli`, el authorize responde `invalid_scope`. La web tiene que estar en producción antes de publicar este release.
- Se descarta el prototipo de menú de selección en la terminal (`--org`, menú TTY): la elección vive en la web, donde el servidor la hace cumplir.

## Capabilities

### New Capabilities
- `oauth-login`: flujo OAuth de `docutray login`. Este change agrega los requisitos sobre los parámetros del authorize (scope y prompt) y sobre qué organización usa el CLI para crear la API key. (El change `add-agent-oauth-login`, todavía sin archivar, define la misma capacidad; ambos deltas son `ADDED`.)

### Modified Capabilities

_Ninguna._

## Impact

- **Código:** `src/oauth.ts` (`buildAuthorizeUrl`), `src/commands/login.ts` (comentario y aviso de varias organizaciones).
- **Tests:** `test/oauth.test.ts` (scope y prompt en la URL), `test/commands/login.test.ts` si cambia el aviso.
- **Docs:** `CHANGELOG.md`. La ayuda de `login` no cambia, así que `docs/commands/` no se regenera salvo que cambie.
- **Dependencia de despliegue:** requiere la web con `docutray:cli` en la fila `docutray-cli` de `oauthClient`. Fuera de este repo: `docutray-skills` deja de recomendar crear la key a mano para elegir organización.
