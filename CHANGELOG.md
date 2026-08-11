# Changelog

All notable changes to `@docutray/cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-08-11

### Added

- `types create --conversion-spec <file|json>` and `types update --conversion-spec <file|json>` ([#36]) set a document type's **conversion spec** — the mapping from extracted JSON to CSV/Excel columns used by tray export. The value can be an inline spec, a file holding a bare spec (`{"columns": [...]}` or `{"sheets": [...]}`), or a full `types export` payload, from which the `conversionSpec` is extracted.
- `types update --no-conversion-spec` clears the stored spec (sends `conversionSpec: null`). Mutually exclusive with `--conversion-spec`.
- `types create --schema <export.json>` now carries over the `conversionSpec` embedded in a `types export` payload, completing the export → create round-trip started in 0.3.2. An explicit `--conversion-spec` takes precedence. `types update --schema` deliberately does *not* carry it: an update only touches the fields you name.
- `types get` shows an `Export spec` summary line (`2 sheets, 14 columns` / `5 columns` / `(none)`). JSON output is unchanged — the field already travelled verbatim.

### Changed

- Bumped the `docutray` SDK to `^0.1.5`, which types `conversionSpec` on `DocumentType`, `DocumentTypeCreateParams` and `DocumentTypeUpdateParams` and exports the `ConversionSpec` family plus the `isMultiSheetConversionSpec()` type guard.

### Notes

- Requires a DocuTray API deployment that supports `conversionSpec` on document types. Against an older deployment the field is accepted and silently ignored — run `docutray types get <code>` to confirm the spec was stored.
- Spec shape validation is intentionally minimal (an object with `columns` or `sheets`) and applies only to values you type. A spec embedded in an export payload is forwarded verbatim, so a shape this CLI doesn't recognize still round-trips; the API validates it and is the source of truth.

## [0.3.2] - 2026-05-07

### Fixed

- `types export` → `types create` round-trip works without `jq` ([#34], [#35]). `parseSchema` detects full `DocumentType` payloads (the shape produced by `types export` / `types get`) and unwraps the inner `jsonSchema` automatically. Raw JSON Schema input keeps working unchanged.
- `types get` / `types export` include `jsonSchema` again ([#32], [#33]). It was previously stripped from the output, breaking export-as-backup and round-trip flows.

### Changed

- Bumped the `docutray` SDK to `^0.1.4` (adds `conversionMode` to `DocumentType`, exports the `ConversionMode` type) and removed the `unknown` casts in `types create` / `types update`.

## [0.3.1] - 2026-05-06

### Security

- Redact `pageOptions` from JSON output to prevent the `apiKey` from leaking on `docutray types list --json` (or when piped) ([#31]). The SDK's `Page` instance carried the API client — and its `apiKey` — as a serializable property; the CLI now passes only `{data, pagination}` and applies a `JSON.stringify` replacer as defense in depth.

  **If you ran `types list` with non-interactive output (`--json` or piped) on 0.3.0 or earlier, rotate your API key.**

## [0.3.0] - 2026-05-05

### Added

- `--oauth` flag on `docutray login` ([#29]). Drives the OAuth flow regardless of TTY state, so AI coding agents and CI runners can authenticate: the CLI prints `Open this URL to authorize: <url>` to stderr, opens the browser, waits for the callback, and persists the API key — without the agent ever seeing the secret.
- `--no-browser` suppresses opening the browser automatically (SSH / headless runners). The URL still goes to stderr.
- `--timeout <seconds>` controls how long the CLI waits for the callback (default 180s).

### Fixed

- API key format validation on `docutray login`, `docutray login --api-key …` and `echo … | docutray login`. Keys that don't match the real format (`dt` + 20 or more URL-safe base64 characters) are rejected. Closes the 0.2.1 bug where `echo "2" | docutray login` silently wrote `{"apiKey":"2"}` to the config file and broke every subsequent command.
- The non-interactive error message now lists `--oauth` as a third valid option.

### Changed

- `startCallbackServer` takes `{preferredPort, host, retries}` (defaults preserve `http://localhost:9876/callback` to match the dashboard's OAuth allowlist).
- Fail fast on `EADDRINUSE` with a message naming the port and the usual cause.
- SIGINT/SIGTERM cleanup closes the listener, so Ctrl-C during OAuth frees the port immediately.

## [0.2.1] - 2026-04-09

### Fixed

Refinements to the OAuth2 login flow introduced in 0.2.0 ([#27]):

- Redirect URI compatibility — use `http://localhost:9876/callback` with an unencoded query string so better-auth can validate it against the registered URL.
- Fixed callback port (9876) — better-auth requires a stable `redirect_uri`. Fails fast with a clear error when the port is taken.
- Organization discovery — fetch orgs via `/api/auth/oauth/organizations` instead of parsing them out of the scope string; pick the first org when several are available.
- Stale `baseUrl` reset — clear `config.baseUrl` on login unless `--base-url` is given, to prevent leaks across sessions.
- Post-login hang — send `Connection: close` on callback responses and force-close lingering sockets, so the CLI exits immediately after `✓ Login successful` instead of hanging on browser keep-alive connections.

## [0.2.0] - 2026-04-08

### Added

- OAuth2 authentication flow on `login` ([#26]) as an alternative to pasting an API key: PKCE (S256) code exchange, a local callback server for the browser redirect, automatic API key creation scoped to the selected organization, and a 120s timeout with clear error messages.
- `--api-key` flag for non-interactive / CI usage.
- `docutray status` now shows organization info.

## [0.1.2] - 2026-04-02

### Added

- `types create` and `types update` commands ([#17]).

### Fixed

- README heading hierarchy and an outdated `--table` flag reference.

[0.4.0]: https://github.com/docutray/docutray-cli/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/docutray/docutray-cli/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/docutray/docutray-cli/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/docutray/docutray-cli/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/docutray/docutray-cli/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/docutray/docutray-cli/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/docutray/docutray-cli/compare/v0.1.1-beta.1...v0.1.2
[#17]: https://github.com/docutray/docutray-cli/pull/17
[#26]: https://github.com/docutray/docutray-cli/pull/26
[#27]: https://github.com/docutray/docutray-cli/pull/27
[#29]: https://github.com/docutray/docutray-cli/pull/29
[#31]: https://github.com/docutray/docutray-cli/pull/31
[#32]: https://github.com/docutray/docutray-cli/issues/32
[#33]: https://github.com/docutray/docutray-cli/pull/33
[#34]: https://github.com/docutray/docutray-cli/issues/34
[#35]: https://github.com/docutray/docutray-cli/pull/35
[#36]: https://github.com/docutray/docutray-cli/pull/36
