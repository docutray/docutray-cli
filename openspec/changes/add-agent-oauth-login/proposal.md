## Why

AI coding agents (Claude Code, Cursor, Codex, Copilot CLI) increasingly drive `docutray` from non-TTY shells, where today's `docutray login` cannot reach the OAuth flow — the menu that gates "paste API key" vs "OAuth in browser" only fires when stderr is interactive. The fallback is the user pasting a `dt_live_…` key into chat (leaks the secret into conversation history) or context-switching to their own terminal. We want agents to drive a fully non-interactive OAuth flow end-to-end, so the secret is exchanged in the user's browser and the agent never sees it.

A second issue surfaced in v0.2.1: when stdin is a non-TTY pipe, the existing `loginWithApiKey` path treats whatever bytes arrive as a valid key. `echo "2" | docutray login` reports success and writes `{ "apiKey": "2" }` to `~/.config/docutray/config.json`, breaking every subsequent command. Piped input must be validated as a real DocuTray API key prefix before it lands on disk.

## What Changes

- Add `--oauth` flag to `docutray login` that triggers OAuth unconditionally, regardless of TTY state. Uses PKCE + a localhost callback server, prints the authorize URL on stderr, opens the browser by default, and writes the resulting API key to `~/.config/docutray/config.json` exactly as the existing TTY OAuth path does.
- Add `--no-browser` flag (skip auto-open, just print URL) and `--timeout <seconds>` flag (default 180s) to support agent and CI scenarios.
- Switch the OAuth callback server from a hardcoded port (`9876`) to an ephemeral port (`0`), with retry on bind failure. Callback URL becomes `http://127.0.0.1:<port>/callback`.
- Validate API keys received via positional arg, `--api-key` flag, and stdin pipe against the DocuTray key format (`^dt_(live|test)_[A-Za-z0-9_-]+$`). Reject mismatches with a clear error and exit non-zero **without** writing to `config.json`.
- Update the non-interactive error message to mention `--oauth` as a third option: `Non-interactive mode requires --api-key, an api-key argument, or --oauth.`
- Update `docutray login --help` description and examples to document `--oauth`, `--no-browser`, and `--timeout`.

## Capabilities

### New Capabilities
- `oauth-login`: non-interactive OAuth login flow on `docutray login --oauth`, including the PKCE callback server lifecycle, browser-open behavior, timeout/cancellation, and stderr/stdout split required for agent use.

### Modified Capabilities
- `input-validation`: extend with API-key format validation for `docutray login` arg/flag/stdin, so non-TTY input cannot persist garbage to the config file.

## Impact

- **Code**: `src/commands/login.ts` (new flags, branching, key validation); `src/oauth.ts` (ephemeral port + retry, configurable timeout, accept caller-provided redirect URI host/port); `src/validators.ts` (new `validateApiKey` helper).
- **Tests**: `test/commands/login.test.ts` adds cases for OAuth success path, timeout, callback error, port-bind retry, stdin/arg key validation accept and reject. May need a small fake authorize/token/org/api-key server for the success-path test.
- **Docs**: regenerated CLI reference (`npm run docs:generate`) picks up the new flags. README "Authentication" section gains an agent-friendly snippet.
- **Behavior**: existing TTY menu (`docutray login` from a real terminal) is unchanged. Existing `--api-key`, positional-arg, and DOCUTRAY_API_KEY env paths are unchanged except that arg/flag/stdin now reject malformed keys instead of saving them.
- **Out of scope**: org-selection UX, new providers/scopes, config encryption, refactoring the existing TTY prompt, changes to `logout`/`status`.
