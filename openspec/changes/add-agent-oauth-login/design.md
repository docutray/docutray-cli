## Context

`docutray login` today branches on stderr TTY:

- TTY → interactive menu (`Do you already have an API key? (y/N)`) → either `loginWithApiKey` or `loginWithOAuth`.
- Non-TTY → `loginWithApiKey` only, gated on `directApiKey = args['api-key'] || flags['api-key']`. If neither is present, the command errors with `Non-interactive mode requires --api-key flag or api-key argument`. Crucially, **stdin is never consulted** in the current code — there is no `cat key | docutray login` path; the user describes one but it currently goes through `args['api-key']` only, and any garbage piped to stdin is ignored. (Despite that, v0.2.1 reports show `echo "2" | docutray login` succeeding with `apiKey: "2"`. We'll re-verify on the branch and add validation regardless.)

The OAuth helper module `src/oauth.ts` already implements PKCE generation, an `http` callback server, code-for-token exchange, org listing, and CLI-key minting — all wired against `https://app.docutray.com/api/auth/...`. Two limitations matter for agent use:

1. **Hardcoded port 9876.** `startCallbackServer` calls `server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1')` and rejects with a fatal error on `EADDRINUSE`. Any other CLI instance, lingering test, or unrelated tool holding 9876 breaks login.
2. **Hardcoded 120s timeout, callback URL uses `localhost`** instead of `127.0.0.1` (the loopback literal Better Auth has historically been pickier about). Build tools and CI runners sometimes resolve `localhost` to IPv6 `::1`, which doesn't match a server bound on `127.0.0.1`.

oclif gives us a single `Login` command class with static `flags` and `args`. The existing JSON output discipline (`outputSuccess`, `outputError`, `setForceJson(flags.json)`) is correct and just needs to be reused on the new branch.

The CLI is shipped via npm as `@docutray/cli` and consumed primarily by AI agents. Output expectations:

- **stdout**: only the final JSON payload (`{"message":"Login successful", ...}`) when JSON mode is active (which it is by default when stdout is piped, plus whenever `--json` is set).
- **stderr**: human-readable status, the OAuth URL, errors. Agents grep this for the URL.

## Goals / Non-Goals

**Goals:**

- One non-interactive command (`docutray login --oauth`) takes an agent and the user from "no credentials" to "key in `~/.config/docutray/config.json`" without typing into the agent's stdin.
- Stdout stays JSON-only on success and on every error path; stderr carries the URL, polling messages, and human-friendly errors.
- Localhost port collisions are recoverable without user intervention.
- Piped/positional API keys cannot persist garbage to disk: rejected with a clear error before `writeConfig` is called.
- Existing TTY menu flow and `--api-key` / positional / env-var flows keep working byte-for-byte (modulo the new key-format check, which is a strict tightening).

**Non-Goals:**

- Refactor of the existing TTY menu (`promptYesNo` / `promptHidden`) or the OAuth helper's transport; we touch them surgically.
- Org-selection UX, multi-org switching, scope changes, or new auth providers.
- Reading and using a piped stdin as an API key. The current code doesn't, the spec doesn't require it, and adding it now means another race condition (stdin vs flag vs arg) we don't need. We ONLY validate stdin if some future code path consumes it — for this change, the validator runs on `args['api-key']` and `flags['api-key']`. (We leave a hook for stdin-consuming callers to use the same validator if added later.)
- Encrypting `~/.config/docutray/config.json`.
- Changes to `logout`, `status`, `convert`, etc.

## Decisions

### D1 — Add `--oauth` as an explicit branch, not as the new default

Three login paths exist post-change: direct key (arg/flag), `--oauth`, and the legacy TTY menu. `--oauth` is selected explicitly by the flag and is independent of TTY state. The dispatch order in `run()` becomes:

1. If `directApiKey` (arg or `--api-key` flag) → `loginWithApiKey(directApiKey)` (now with validation).
2. Else if `flags.oauth` → `loginWithOAuth({ openBrowser: !flags['no-browser'], timeoutMs: flags.timeout * 1000 })`.
3. Else if `isStderrInteractive()` → existing TTY menu.
4. Else → existing non-interactive error, with message updated to include `--oauth`.

`--oauth` and `--api-key` (or positional) together is an error: `--oauth cannot be combined with an api-key argument or --api-key flag`. Reject early in `run()` before any side effect.

**Alternative considered:** auto-pick OAuth when stdin is non-TTY and no key is supplied. Rejected: silently launching a browser from a CI run or a `nohup`'d script is hostile and breaks pipes that expect immediate exit on missing creds. Explicit flag, no surprises.

### D2 — Reuse `loginWithOAuth`, parameterize the OAuth helper

We do **not** create `src/auth/oauth.ts`. The existing `src/oauth.ts` already encodes the protocol; what's missing is configurability. Modify `startCallbackServer` to accept options:

```ts
startCallbackServer(opts?: {
  preferredPort?: number       // default: 0 (ephemeral)
  retries?: number             // default: 3
  host?: string                // default: '127.0.0.1'
})
```

When `preferredPort === 0`, OS picks an ephemeral port — no retry needed; the kernel won't hand out a busy one. Keep `retries` for the legacy TTY path that still wants 9876 (Better Auth's current redirect-URI allowlist accepts loopback-with-any-port for `client_id=docutray-cli`; if not, document and revisit).

Keep `buildAuthorizeUrl` taking `port` so the OAuth helper stays the single source of truth for the redirect URI string. Switch the callback URL host from `localhost` to `127.0.0.1` in both `buildAuthorizeUrl` and `loginWithOAuth`'s `redirectUri`. This is a strict improvement (matches the bound interface) and Better Auth allows loopback IP literals per RFC 8252.

`waitForCallback(timeoutMs)` already accepts a timeout argument; surface it.

`loginWithOAuth(config, opts)` gains an opts object: `{ openBrowser: boolean; timeoutMs: number }`. The TTY-menu caller passes `{ openBrowser: true, timeoutMs: 120_000 }` (preserves current behavior). The `--oauth` caller uses `{ openBrowser: !flags['no-browser'], timeoutMs: flags.timeout * 1000 }` with default 180s.

**Alternative considered:** new module under `src/auth/`. Rejected: only one module touches OAuth, the proposal is small, and a parallel module increases drift risk on the helper's already-subtle URL/PKCE logic.

### D3 — Ephemeral port, host `127.0.0.1`, no manual retry

`server.listen(0, '127.0.0.1', ...)` then read `(server.address() as AddressInfo).port`. The "port collision retry" the proposal mentions is implicit — port 0 cannot collide. We still keep an `EADDRINUSE` retry path because the legacy 9876 caller may need it; but for `--oauth` we take ephemeral and call it done.

Rationale for `127.0.0.1` over `localhost`: avoids IPv6/IPv4 mismatches on hosts where `localhost` resolves to `::1` first (some CI images, some Linux distros with `/etc/hosts` ordering quirks). RFC 8252 §7.3 explicitly endorses loopback IP literals for native-app OAuth.

### D4 — API key format validation

Add `validateApiKey(value: string): string` in `src/validators.ts`:

- Pattern: `^dt_(live|test)_[A-Za-z0-9_-]{16,}$` (the `_-` allows for base64url-style payloads; `{16,}` rules out trivial junk like `dt_live_x`).
- On success, returns the trimmed value.
- On failure, throws `Error("Invalid API key format. Expected dt_live_… or dt_test_… (got: <first 12 chars>…)")`.

Call it from `Login.run()` immediately after `directApiKey = args['api-key'] || flags['api-key']`, before `loginWithApiKey` runs. Throw is caught by the existing `try/catch` and reported via `outputError`. Result: the call to `writeConfig` only fires on validated input.

The exact regex is committed to in code, not in spec, so we can tighten it (e.g. fixed length) once the dashboard's key generator is documented. The spec asserts "rejects malformed keys", not the precise regex.

**Alternative considered:** validate at SDK call time (let the API reject). Rejected: the proposal is explicit that we must not write to `config.json` before validation, and round-tripping to the API for what's locally checkable is slow and offline-hostile.

### D5 — Output discipline on the OAuth path

The current `loginWithOAuth` writes status lines (`Opening browser…`, `Waiting for authentication…`, `Exchanging…`, `Fetching organizations…`, `Creating API key…`) directly to `process.stderr`. That is correct for both flows; we keep it. We add **one** line at the very start: `Open this URL to authorize: <url>` (also stderr). This is the documented detection prefix for agents — easy to grep with `Open this URL to authorize:`.

When `--no-browser` is set, we skip the `open()` call but still print the URL line. That's the only difference for the browser-disabled case.

The final stdout JSON is unchanged in shape (`{message, apiKey, organizationId, organizationName, configPath, [baseUrl]}`).

### D6 — Cancellation and cleanup

The HTTP server is created in `loginWithOAuth` and closed in its `finally` block — already correct. We need to handle two new cases:

- **Timeout fires before callback**: `waitForCallback` rejects with `Authentication timed out after Ns`. The `finally` closes the server. The proposal asks for a slightly different error string (`OAuth timed out after Ns`); we'll align on `Authentication timed out after Ns` (matches the existing helper's wording) — **callout for the open question below**.
- **Ctrl-C / SIGTERM**: install a one-shot signal handler in `loginWithOAuth` that calls `close()` then re-raises the default behavior (process exits non-zero). Without it, the bound socket can linger long enough to confuse the next invocation. We don't need to print anything on signal — Node's default is fine.

### D7 — Tests

The login command already has `test/commands/login.test.ts`. Extend it; do not create a parallel suite. New cases:

1. `--oauth` happy path: spy on `startCallbackServer` to return a controllable `waitForCallback`; spy on `exchangeCodeForToken`, `fetchOrganizations`, `createApiKeyFromToken` (already exported). Assert stdout is one JSON line with the expected shape, stderr contains `Open this URL to authorize:`, `writeConfig` is called with the right payload.
2. `--oauth --timeout 1` with `waitForCallback` never resolving → exits non-zero, stderr error message includes "timed out", `writeConfig` NOT called.
3. Callback delivers `error=access_denied` → exits non-zero, error message contains the provider error, `writeConfig` NOT called.
4. `--oauth --no-browser` → asserts that `open` (the dynamic-imported package) is **not** invoked but the URL line is still on stderr. Mock the dynamic import via `vi.mock('open', () => ({default: vi.fn()}))`.
5. Port-bind retry: spy `startCallbackServer` to throw `EADDRINUSE` once, then succeed; OR (simpler) directly unit-test `startCallbackServer({preferredPort: 0})` returning a port and accepting a request. The legacy `9876` retry path is exercised by the existing TTY tests if any; if not, add one.
6. `validateApiKey`: unit tests for each accept/reject case (valid `dt_live_…`, valid `dt_test_…`, malformed, empty, prefix-only, wrong characters).
7. `docutray login dt_live_REAL` (positional): unchanged success path, but now the call goes through `validateApiKey` first. Assert no regression.
8. `docutray login wrong-key`: positional → exits non-zero, `writeConfig` NOT called, error mentions "Invalid API key format".
9. Combined `--oauth --api-key dt_live_…`: rejected up front before any network or filesystem action.

Tests stay unit-level: no real port binding except for #5, which uses `127.0.0.1:0` and asserts the chosen port differs from `9876`.

### D8 — Help text and docs

`Login.description` and `Login.examples` are static strings. Append `--oauth` example:

```
{command: '<%= config.bin %> login --oauth', description: 'Login via OAuth in the browser (works in non-TTY agents/CI)'}
```

Add `--oauth`, `--no-browser`, `--timeout` to `Login.flags`. After build, `npm run docs:generate` regenerates the CLI reference, which is checked in under `docs/`. Re-run as part of the change; commit the resulting diff.

## Risks / Trade-offs

- **OAuth callback URL change (`localhost` → `127.0.0.1`).** Better Auth's allowlist may not accept the new redirect URI even though RFC 8252 says it should. → Mitigation: smoke-test against `https://app.docutray.com` on the branch before merge. If rejected, keep `localhost` for the URL but bind the server on `0.0.0.0` (broader, slightly worse) or get the dashboard to add the literal. Open question logged below.
- **Browser auto-open in headless environments.** `open` will fail silently or hang on a server with no GUI. → Mitigation: `--no-browser` is the documented escape hatch; we also do not block the URL print on `open()` succeeding (the URL goes to stderr first, then we attempt open). On failure, swallow and continue; the URL is already printed.
- **Validator over-tight.** If the dashboard ever issues keys with a different prefix or charset, our regex blocks legitimate logins. → Mitigation: document the regex in the validator's JSDoc with a pointer to the dashboard's key generator and add a single source-of-truth constant. The regex is intentionally permissive on length/chars to absorb minor changes.
- **Agent races between two `--oauth` invocations on the same machine.** Both bind ephemeral ports (no collision) and each has its own `state` and PKCE pair (no cross-talk), but the user's browser only has one active tab — they may approve the first one and the second times out. → Acceptable: each invocation prints its own URL, so the user can pick which to authorize. The losers time out cleanly and exit non-zero.
- **State parameter mismatch error.** Existing message references "possible CSRF attack" which is alarming and unhelpful in the legitimate failure mode (browser cached an old state). → Out of scope here; flag for a follow-up.

## Migration Plan

No data migration. Rollout is a normal npm release:

1. Land PR with code, tests, regenerated docs.
2. Bump `package.json` to `0.3.0` (minor — net-new flag, no breaking changes).
3. `gh release create v0.3.0` triggers the publish workflow.
4. Update `docutray/docutray-skills` to recommend `docutray login --oauth` as the canonical agent path.

Rollback: revert the npm `latest` tag to `0.2.x` via `npm dist-tag`. Behavior of agent skills that learned `--oauth` will fall back to the existing menu/error message.

## Open Questions

- **Timeout error wording.** Proposal asks for `OAuth timed out after Ns`; existing helper says `Authentication timed out after Ns`. Pick one and pin it in the spec (current draft uses the helper's wording for consistency).
- **Loopback host literal.** Confirm Better Auth accepts `http://127.0.0.1:<port>/callback` for `client_id=docutray-cli` before we ship. If not, keep `localhost` and rely on resolver behavior.
- **Default timeout.** Proposal says 180s; existing flow uses 120s. We pick 180s for the `--oauth` path (the typical agent flow includes the user reading and switching tabs, longer than a manual menu prompt) but keep 120s as the menu's default. Worth confirming with the user.
- **Should `validateApiKey` also reject keys whose length is suspiciously short** (e.g., < 24 chars total)? The current regex requires `{16,}` after the prefix; we may tighten once we know the real key length.
