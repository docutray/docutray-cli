import {afterEach, describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../src/config.js', () => ({
  getBaseUrl: vi.fn(() => 'https://app.docutray.com'),
}))

import {
  buildAuthorizeUrl,
  createApiKeyFromToken,
  exchangeCodeForToken,
  fetchOrganizations,
  generatePKCE,
  startCallbackServer,
} from '../src/oauth.js'

describe('generatePKCE', () => {
  it('returns codeVerifier and codeChallenge', () => {
    const {codeVerifier, codeChallenge} = generatePKCE()
    expect(codeVerifier).toBeTruthy()
    expect(codeChallenge).toBeTruthy()
    expect(codeVerifier).not.toBe(codeChallenge)
  })

  it('generates different values each call', () => {
    const a = generatePKCE()
    const b = generatePKCE()
    expect(a.codeVerifier).not.toBe(b.codeVerifier)
  })

  it('codeVerifier is base64url encoded', () => {
    const {codeVerifier} = generatePKCE()
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('codeChallenge is base64url encoded', () => {
    const {codeChallenge} = generatePKCE()
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('buildAuthorizeUrl', () => {
  it('constructs correct URL with all params', () => {
    const url = buildAuthorizeUrl(9876, 'test-state', 'test-challenge')
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://app.docutray.com')
    expect(parsed.pathname).toBe('/api/auth/oauth2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('docutray-cli')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:9876/callback')
    expect(parsed.searchParams.get('state')).toBe('test-state')
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('scope')).toBe('openid docutray:cli')
    expect(parsed.searchParams.get('prompt')).toBe('consent')
  })

  it('encodes the scope separator as %20 in the raw query', () => {
    const url = buildAuthorizeUrl(9876, 'state', 'challenge')
    expect(url).toContain('scope=openid%20docutray:cli')
    expect(url).toContain('&prompt=consent&')
  })

  it('uses localhost in the redirect_uri (matches dashboard allowlist)', () => {
    const url = buildAuthorizeUrl(9876, 'state', 'challenge')
    expect(url).toContain('redirect_uri=http://localhost:9876/callback')
  })
})

describe('startCallbackServer', () => {
  it('binds default port 9876', async () => {
    const {port, close} = await startCallbackServer()
    expect(port).toBe(9876)
    close()
  })

  it('honors an explicit ephemeral preferredPort', async () => {
    const {port, close} = await startCallbackServer({preferredPort: 0})
    expect(port).toBeGreaterThan(0)
    close()
  })

  it('resolves with code and state on valid callback', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()

    // Simulate browser callback
    await fetch(`http://127.0.0.1:${port}/callback?code=test-code&state=test-state`)

    const result = await promise
    expect(result.code).toBe('test-code')
    expect(result.state).toBe('test-state')
    close()
  })

  it('rejects on OAuth error callback', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()

    // Start the fetch but don't await it yet - let the server process the request
    const fetchPromise = fetch(`http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied`)

    await expect(promise).rejects.toThrow('OAuth error (access_denied): User denied')
    await fetchPromise
    close()
  })

  it('keeps the error code when the callback has no description', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()
    const fetchPromise = fetch(`http://127.0.0.1:${port}/callback?error=access_denied`)

    await expect(promise).rejects.toThrow(/^OAuth error: access_denied$/)
    await fetchPromise
    close()
  })

  it('exposes the OAuth error code for invalid_scope from a server without docutray:cli', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()
    // Shape of Better Auth's authorize redirect for an unknown scope.
    const fetchPromise = fetch(
      `http://127.0.0.1:${port}/callback?error=invalid_scope` +
      `&error_description=The+following+scopes+are+invalid%3A+docutray%3Acli&state=s`,
    )

    const error = await promise.catch((e: Error & {oauthError?: string}) => e)
    expect(error.message).toBe('OAuth error (invalid_scope): The following scopes are invalid: docutray:cli')
    expect(error.oauthError).toBe('invalid_scope')
    await fetchPromise
    close()
  })

  it('strips control characters (terminal escapes) from callback error params', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()
    const fetchPromise = fetch(`http://127.0.0.1:${port}/callback?error=access_denied&error_description=%1B%5B31mred%1B%5B0m%0Aline`)

    await expect(promise).rejects.toThrow(/^OAuth error \(access_denied\): \[31mred\[0mline$/)
    await fetchPromise
    close()
  })

  it('strips bidi and zero-width characters from callback error params', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()
    const fetchPromise = fetch(`http://127.0.0.1:${port}/callback?error=access_denied&error_description=a%E2%80%AEb%E2%80%8Bc%E2%81%A6d`)

    await expect(promise).rejects.toThrow(/^OAuth error \(access_denied\): abcd$/)
    await fetchPromise
    close()
  })

  it('ignores error callbacks whose state does not match the expected one', async () => {
    const {port, close, waitForCallback} = await startCallbackServer({preferredPort: 0, state: 'expected'})
    const promise = waitForCallback(2000)

    const forged = await fetch(`http://127.0.0.1:${port}/callback?error=invalid_scope&error_description=forged&state=other`)
    expect(forged.status).toBe(400)
    const stateless = await fetch(`http://127.0.0.1:${port}/callback?error=invalid_scope&error_description=forged`)
    expect(stateless.status).toBe(400)

    const real = fetch(`http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied&state=expected`)
    await expect(promise).rejects.toThrow('OAuth error (access_denied): User denied')
    await real
    close()
  })

  it('keeps an error callback that arrives before waitForCallback without an unhandled rejection', async () => {
    const {port, close, waitForCallback} = await startCallbackServer({preferredPort: 0})
    await fetch(`http://127.0.0.1:${port}/callback?error=access_denied`)
    await new Promise((resolve) => setTimeout(resolve, 20))

    await expect(waitForCallback(1000)).rejects.toThrow('OAuth error: access_denied')
    close()
  })

  it('rejects on timeout', async () => {
    const {close, waitForCallback} = await startCallbackServer()
    await expect(waitForCallback(100)).rejects.toThrow('Authentication timed out')
    close()
  })

  it('retries to next port on EADDRINUSE when preferredPort is set', async () => {
    // Bind one server on an arbitrary port, then ask the helper to start on
    // that same port — it should retry on port+1, port+2, etc.
    const blocker = await startCallbackServer()
    try {
      const {port, close} = await startCallbackServer({preferredPort: blocker.port, retries: 3})
      expect(port).toBeGreaterThan(blocker.port)
      expect(port).toBeLessThanOrEqual(blocker.port + 3)
      close()
    } finally {
      blocker.close()
    }
  })
})

describe('DocuTray OAuth endpoint errors', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('fetchOrganizations names the step, shows the server message and keeps the status', async () => {
    const message = 'Ya no eres miembro de la organización autorizada. Vuelve a iniciar sesión.'
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({error: message}), {status: 401}))

    const error = await fetchOrganizations('token').catch((e: Error & {body?: unknown; statusCode?: number}) => e)
    expect(error.message).toBe(`Failed to fetch organizations: ${message}`)
    expect(error.statusCode).toBe(401)
    expect(error.body).toEqual({error: `Failed to fetch organizations: ${message}`})
  })

  it('fetchOrganizations keeps the raw body when the response is not JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('<html>Bad Gateway</html>', {status: 502}))

    const error = await fetchOrganizations('token').catch((e: Error & {statusCode?: number}) => e)
    expect(error.message).toBe('Failed to fetch organizations: <html>Bad Gateway</html>')
    expect(error.statusCode).toBe(502)
  })

  it('createApiKeyFromToken names the step and keeps the status', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({error: 'Forbidden organization'}), {status: 403}))

    const error = await createApiKeyFromToken('token', 'org_other').catch((e: Error & {statusCode?: number}) => e)
    expect(error.message).toBe('API key creation failed: Forbidden organization')
    expect(error.statusCode).toBe(403)
  })

  it('exchangeCodeForToken includes the OAuth error code and description', async () => {
    fetchSpy.mockResolvedValue(new Response(
      JSON.stringify({error: 'invalid_grant', error_description: 'Authorization code expired'}),
      {status: 400},
    ))

    const error = await exchangeCodeForToken('code', 'verifier', 'http://localhost:9876/callback')
      .catch((e: Error & {statusCode?: number}) => e)
    expect(error.message).toBe('Token exchange failed: invalid_grant: Authorization code expired')
    expect(error.statusCode).toBe(400)
  })
})
