import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../src/config.js', () => ({
  getBaseUrl: vi.fn(() => 'https://app.docutray.com'),
}))

import {
  buildAuthorizeUrl,
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
    expect(parsed.searchParams.get('scope')).toBe('openid')
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

    await expect(promise).rejects.toThrow('OAuth error: User denied')
    await fetchPromise
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
