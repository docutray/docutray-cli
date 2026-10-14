# Spec Delta

## Purpose

Login OAuth de `docutray login`: obtiene en el navegador una API key para una organización del usuario y la guarda en la configuración local, sin exponer el secreto a la terminal ni al agente.

## ADDED Requirements

### Requirement: Authorize request selects an organization in the web consent
The OAuth authorization URL built by `docutray login` SHALL request the scopes `openid` and `docutray:cli`, and SHALL include `prompt=consent`, so the DocuTray consent screen shows its organization selector on every login and binds the resulting token to the organization the user picks.

#### Scenario: Authorization URL carries the CLI scope
- **WHEN** the user runs `docutray login --oauth --no-browser`
- **THEN** stderr contains `Open this URL to authorize:` followed by a URL whose `scope` parameter decodes to `openid docutray:cli`

#### Scenario: Authorization URL forces the consent screen
- **WHEN** the user runs `docutray login --oauth --no-browser`
- **THEN** the printed authorization URL contains `prompt=consent`

#### Scenario: Server without the CLI scope
- **WHEN** the authorization server rejects the request and redirects to the callback with `error=invalid_scope` and an `error_description`
- **THEN** stderr shows an OAuth error that contains both `invalid_scope` and the server's error description
- **AND** the error tells the user to log in with `docutray login --api-key`, adding `--base-url <url>` when the login used a custom base URL
- **AND** the process exits with non-zero code
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: Forged error callback is ignored
- **WHEN** a request reaches the local callback with an `error` parameter and a `state` that does not match the login's state, or no `state`
- **THEN** the CLI answers it with an error page and keeps waiting for the real callback
- **AND** the login is not aborted by that request

### Requirement: API key is created for the organization bound by the server
After exchanging the authorization code, the CLI SHALL create the API key for the first organization returned by the organizations endpoint, which for a token bound in the consent screen is the only organization returned. The CLI SHALL NOT prompt for an organization in the terminal.

#### Scenario: Token bound to the chosen organization
- **WHEN** the user picks organization "Acme" in the consent screen
- **AND** the organizations endpoint returns only "Acme"
- **THEN** the CLI creates the API key for "Acme"
- **AND** stdout reports `organizationName` "Acme"
- **AND** stderr does not contain a multiple-organizations warning

#### Scenario: Server returns several organizations
- **WHEN** the organizations endpoint returns more than one organization
- **THEN** the CLI creates the API key for the first one without prompting
- **AND** stderr contains a warning naming the organization used

#### Scenario: User is no longer a member of the bound organization
- **WHEN** the organizations endpoint fails with status 401 and a JSON body `{"error": "<message>"}`
- **THEN** stderr shows an error that names the failed step and contains `<message>`
- **AND** the HTTP status is reported (`status` field in piped JSON)
- **AND** the process exits with non-zero code
- **AND** `~/.config/docutray/config.json` is not modified

#### Scenario: No organizations returned
- **WHEN** the organizations endpoint returns an empty list
- **THEN** stderr shows an error indicating no organizations were found
- **AND** the process exits with non-zero code
- **AND** `~/.config/docutray/config.json` is not modified
