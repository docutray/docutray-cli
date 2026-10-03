## Why

Dashboard-created API keys can lack the `dt` prefix added by the OAuth route. `docutray login --api-key` rejects these keys locally, preventing users from saving a key for their chosen organization. Fixes #38.

## What Changes

- Accept unprefixed URL-safe keys with at least 32 characters while retaining existing `dt` keys with at least 20 payload characters.
- Keep rejecting malformed input before writing configuration.
- Remove credential previews from validation errors and retain masked success output.
- Correct the authentication guide and add regression coverage for both login input forms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `input-validation`: document the compatible API key formats and credential-safe errors.

## Impact

Changes are limited to the shared validator, login tests, authentication documentation, and specs. No dependencies, API requests, command flags, or credential precedence change.
