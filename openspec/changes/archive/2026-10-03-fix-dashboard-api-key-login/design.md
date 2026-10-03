## Context

The dashboard calls the key generator without a prefix; the OAuth route explicitly supplies `dt`. The generator currently emits 64 URL-safe payload characters. The CLI incorrectly treats the prefix as mandatory. The SDK already accepts credentials verbatim, so this requires no additional API logic.

## Goals

Accept both key formats through the existing oclif positional argument and `--api-key` flag. Preserve older `dt` credentials and reject obvious paste mistakes before configuration is written.

## Non-Goals

OAuth organization selection, server-side key verification during login, releases, and changes to config storage or credential precedence.

## Decisions

Keep validation in `src/validators.ts`. Accept `dt` followed by at least 20 URL-safe characters, or an opaque URL-safe token of at least 32 characters. The latter is a permissive format guard below the current 64-character generator length; it does not prove authenticity or identify the organization. The server remains responsible for authentication.

Trim surrounding whitespace and reject embedded whitespace and non-URL-safe characters. Use the existing command error handling and exit codes. Validation errors omit the supplied key in both human and JSON output; successful login continues to mask the key.

## Risks / Trade-offs

A long URL-safe string can pass the local format guard and still be rejected by the API. This is expected: local validation checks syntax only. Existing short `dt` keys retain their previous minimum to avoid breaking stored credentials.
