## 1. Branch and scaffolding

- [x] 1.1 Create branch `feat/agent-oauth-login` off `main`
- [ ] 1.2 Reproduce the v0.2.1 stdin bug locally (`echo "2" | docutray login` writes `apiKey: "2"`); capture the actual current behavior in the test plan, since it differs from what the source suggests
- [ ] 1.3 Confirm Better Auth accepts `http://127.0.0.1:<port>/callback` as a redirect URI for `client_id=docutray-cli` against `https://app.docutray.com` (smoke test before code lands)

## 2. API key validation (`src/validators.ts`)

- [x] 2.1 Add a `DOCUTRAY_API_KEY_PATTERN` constant: `/^dt_(live|test)_[A-Za-z0-9_-]{16,}$/`
- [x] 2.2 Add `validateApiKey(value: string): string` — trim, validate against pattern, throw `Error("Invalid API key format. Expected dt_live_… or dt_test_… (got: <first 12 chars>…)")` on failure, return trimmed value on success
- [x] 2.3 Unit-test `validateApiKey` in a new `test/validators.test.ts` (or extend if it exists): valid `dt_live_…`, valid `dt_test_…`, leading/trailing whitespace, empty string, prefix-only `dt_live_`, wrong prefix `sk_live_…`, garbage `"2"`, non-base64url chars

## 3. OAuth helper updates (`src/oauth.ts`)

- [x] 3.1 Change `startCallbackServer` signature to accept an options object: `{ preferredPort?: number; retries?: number; host?: string }` with defaults `{ preferredPort: 0, retries: 3, host: '127.0.0.1' }`; preserve the existing public return shape (`{port, close, waitForCallback}`)
- [x] 3.2 When `preferredPort === 0`, bind once with `server.listen(0, host)` and read the chosen port from `server.address()`; skip retry logic
- [x] 3.3 When `preferredPort > 0`, retry on `EADDRINUSE` up to `retries` times, falling back to `preferredPort + 1`, `preferredPort + 2`, …; if all retries fail, throw the existing `EADDRINUSE` error
- [x] 3.4 Change `buildAuthorizeUrl` to use `http://127.0.0.1:<port>/callback` instead of `http://localhost:<port>/callback`
- [x] 3.5 Update `loginWithOAuth` (in `src/commands/login.ts`) to construct `redirectUri` with `127.0.0.1` so it matches the new authorize URL
- [x] 3.6 Add a unit test that `startCallbackServer({preferredPort: 0})` returns a non-zero, non-9876 port and that an HTTP request to `http://127.0.0.1:<port>/callback?code=X&state=Y` resolves `waitForCallback` with `{code: 'X', state: 'Y'}`

## 4. Login command — flags and dispatch (`src/commands/login.ts`)

- [x] 4.1 Add new flags: `oauth: Flags.boolean({default: false, description: 'Login via OAuth in the browser (works without a TTY)'})`, `'no-browser': Flags.boolean({default: false, description: 'Skip opening the browser; print the URL only'})`, `timeout: Flags.integer({default: 180, description: 'OAuth callback timeout in seconds (--oauth only)'})`
- [x] 4.2 In `run()`, after `setForceJson`, reject `flags.oauth && (args['api-key'] || flags['api-key'])` with `Error("--oauth cannot be combined with an api-key argument or --api-key flag")`
- [x] 4.3 Insert the new dispatch order: direct key → `--oauth` → TTY menu → non-interactive error
- [x] 4.4 Update the non-interactive error message to: `Non-interactive mode requires --api-key, an api-key argument, or --oauth.`
- [x] 4.5 Wrap `loginWithApiKey(directApiKey.trim(), config)` so the trim happens via `validateApiKey(directApiKey)` instead; let validation errors bubble to the existing `try/catch` (which calls `outputError` and exits 1)
- [x] 4.6 Refactor `loginWithOAuth(config)` to `loginWithOAuth(config, opts: {openBrowser: boolean; timeoutMs: number})`; the existing TTY-menu caller passes `{openBrowser: true, timeoutMs: 120_000}` to preserve current behavior
- [x] 4.7 In `loginWithOAuth`, before any other stderr output, write `Open this URL to authorize: <url>\n` (the agent-detectable prefix)
- [x] 4.8 Conditionally call `await open(authorizeUrl)` only when `opts.openBrowser`; on rejection from `open`, swallow and continue (don't abort)
- [x] 4.9 Pass `opts.timeoutMs` through to `waitForCallback(timeoutMs)`
- [x] 4.10 Install a one-shot `SIGINT`/`SIGTERM` handler in `loginWithOAuth` that calls `close()` and re-emits the signal so the process exits non-zero with the listener cleaned up
- [x] 4.11 Update `Login.description` to mention OAuth as the canonical agent flow and add to `Login.examples`: `{command: '<%= config.bin %> login --oauth', description: 'Login via OAuth in the browser (works in agents/CI without a TTY)'}` and `{command: '<%= config.bin %> login --oauth --no-browser', description: 'Print the OAuth URL but do not open the browser'}`

## 5. Tests (`test/commands/login.test.ts`)

- [x] 5.1 Mock `src/oauth.js` exports (`startCallbackServer`, `exchangeCodeForToken`, `fetchOrganizations`, `createApiKeyFromToken`, `buildAuthorizeUrl`, `generatePKCE`) so tests don't hit the network or bind real sockets except where intended
- [x] 5.2 Mock the dynamic-imported `open` package (`vi.mock('open', () => ({default: vi.fn()}))`) and assert it is/isn't called per scenario
- [x] 5.3 Test: `--oauth` happy path → stdout is one JSON object with the expected shape, stderr contains `Open this URL to authorize:`, `writeConfig` called with the masked-on-output unmasked-on-disk key
- [x] 5.4 Test: `--oauth --timeout 1` with `waitForCallback` returning a never-resolving promise → exits non-zero within ~1s + overhead, stderr error contains "timed out", `writeConfig` NOT called
- [x] 5.5 Test: `--oauth` with `waitForCallback` rejecting `Error("OAuth error: User denied access")` → exits non-zero, stderr contains `User denied access`, `writeConfig` NOT called
- [x] 5.6 Test: `--oauth --no-browser` → mocked `open` is NOT called, but the URL line is still on stderr
- [x] 5.7 Test: `--oauth --api-key dt_live_...` and `--oauth dt_live_...` (positional) → both rejected before any helper is invoked
- [x] 5.8 Test: `docutray login dt_live_REAL_LOOKING_KEY_0123` → success path unchanged (regression test for D4)
- [x] 5.9 Test: `docutray login 2` → exits non-zero, `writeConfig` NOT called, stderr error starts with `Invalid API key format`
- [x] 5.10 Test: non-interactive shell with no flags and no key → updated error message includes `--api-key`, an api-key argument, AND `--oauth`
- [x] 5.11 Test: help output (snapshot or substring check) includes `--oauth`, `--no-browser`, `--timeout`, and the new example

## 6. Docs and release

- [x] 6.1 Run `npm run docs:generate`; commit the regenerated CLI reference
- [x] 6.2 Update README "Authentication" section with an agent snippet: `docutray login --oauth` then `docutray status`
- [x] 6.3 Run `npm run build && npm run test` locally; both clean
- [ ] 6.4 Open PR titled `feat(login): add --oauth flag for non-interactive agent auth (#<issue>)` referencing this change and the openspec directory
- [ ] 6.5 After merge, bump `package.json` to `0.3.0`, commit, `gh release create v0.3.0` (publish workflow handles the npm publish via OIDC)
- [ ] 6.6 Update `docutray/docutray-skills` to recommend `docutray login --oauth` as the canonical agent auth path
