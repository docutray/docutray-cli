import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../src/config.js', () => ({
  getBaseUrl: vi.fn(() => 'https://app.docutray.com'),
}))

import {
  buildAuthorizeUrl,
  extractOrgFromScope,
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
    const url = buildAuthorizeUrl(3456, 'test-state', 'test-challenge')
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://app.docutray.com')
    expect(parsed.pathname).toBe('/api/auth/oauth2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('docutray-cli')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3456')
    expect(parsed.searchParams.get('state')).toBe('test-state')
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('scope')).toBe('openid')
  })
})

describe('extractOrgFromScope', () => {
  it('extracts org id from scope string', () => {
    expect(extractOrgFromScope('openid org:org_123')).toBe('org_123')
  })

  it('returns undefined when no org in scope', () => {
    expect(extractOrgFromScope('openid profile')).toBeUndefined()
  })

  it('returns undefined for empty scope', () => {
    expect(extractOrgFromScope('')).toBeUndefined()
  })

  it('extracts first org from multiple scopes', () => {
    expect(extractOrgFromScope('openid org:abc123 email')).toBe('abc123')
  })
})

describe('startCallbackServer', () => {
  it('starts server on a random port', async () => {
    const {port, close} = await startCallbackServer()
    expect(port).toBeGreaterThan(0)
    close()
  })

  it('resolves with code and state on valid callback', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()

    // Simulate browser callback
    await fetch(`http://127.0.0.1:${port}/?code=test-code&state=test-state`)

    const result = await promise
    expect(result.code).toBe('test-code')
    expect(result.state).toBe('test-state')
    close()
  })

  it('rejects on OAuth error callback', async () => {
    const {port, close, waitForCallback} = await startCallbackServer()
    const promise = waitForCallback()

    // Start the fetch but don't await it yet - let the server process the request
    const fetchPromise = fetch(`http://127.0.0.1:${port}/?error=access_denied&error_description=User+denied`)

    await expect(promise).rejects.toThrow('OAuth error: User denied')
    await fetchPromise
    close()
  })

  it('rejects on timeout', async () => {
    const {close, waitForCallback} = await startCallbackServer()
    await expect(waitForCallback(100)).rejects.toThrow('Authentication timed out')
    close()
  })
})
