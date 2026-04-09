import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    randomUUID: vi.fn(() => 'fixed-state-123'),
  }
})

vi.mock('../../src/config.js', () => ({
  getConfigPath: vi.fn(() => '/home/user/.config/docutray/config.json'),
  maskApiKey: vi.fn((key: string) => key.slice(0, 4) + '****' + key.slice(-4)),
  readConfig: vi.fn(() => ({})),
  writeConfig: vi.fn(),
  getBaseUrl: vi.fn(() => undefined),
}))

vi.mock('../../src/oauth.js', () => ({
  buildAuthorizeUrl: vi.fn(() => 'https://app.docutray.com/api/auth/oauth2/authorize?test=1'),
  createApiKeyFromToken: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  fetchOrganizations: vi.fn(),
  generatePKCE: vi.fn(() => ({codeVerifier: 'test-verifier', codeChallenge: 'test-challenge'})),
  startCallbackServer: vi.fn(),
}))

vi.mock('open', () => ({
  default: vi.fn(),
}))

vi.mock('node:readline', () => {
  let nextAnswer = ''
  return {
    createInterface: vi.fn(() => ({
      close: vi.fn(),
      on: vi.fn((event: string, listener: Function) => {
        if (event === 'line') {
          setTimeout(() => listener(nextAnswer), 5)
        }
        return {close: vi.fn(), on: vi.fn()}
      }),
    })),
    __setNextAnswer: (answer: string) => { nextAnswer = answer },
  }
})

import {writeConfig, readConfig} from '../../src/config.js'
import {
  createApiKeyFromToken,
  exchangeCodeForToken,
  fetchOrganizations,
  startCallbackServer,
} from '../../src/oauth.js'
import Login from '../../src/commands/login.js'

const mockWriteConfig = vi.mocked(writeConfig)
const mockStartCallbackServer = vi.mocked(startCallbackServer)
const mockExchangeCodeForToken = vi.mocked(exchangeCodeForToken)
const mockFetchOrganizations = vi.mocked(fetchOrganizations)
const mockCreateApiKeyFromToken = vi.mocked(createApiKeyFromToken)

describe('login with --api-key flag', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('saves API key from --api-key flag', async () => {
    await Login.run(['--api-key', 'dt_live_abc12345'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_abc12345'}),
    )
  })

  it('saves API key from positional argument', async () => {
    await Login.run(['dt_live_abc12345'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_abc12345'}),
    )
  })

  it('outputs success with masked key', async () => {
    await Login.run(['dt_live_abc12345', '--json'])
    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    const parsed = JSON.parse(output)
    expect(parsed.message).toBe('Login successful')
    expect(parsed.apiKey).toContain('****')
  })

  it('saves base-url when provided', async () => {
    await Login.run(['--api-key', 'dt_live_abc12345', '--base-url', 'https://staging.docutray.com'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'dt_live_abc12345',
        baseUrl: 'https://staging.docutray.com',
      }),
    )
  })
})

describe('login with OAuth2 flow', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  function setupOAuthMocks() {
    const closeFn = vi.fn()
    mockStartCallbackServer.mockResolvedValue({
      port: 9876,
      close: closeFn,
      waitForCallback: vi.fn().mockResolvedValue({code: 'auth-code', state: 'fixed-state-123'}),
    })

    mockExchangeCodeForToken.mockResolvedValue({
      access_token: 'oauth-token-123',
      token_type: 'bearer',
      expires_in: 3600,
    })

    mockFetchOrganizations.mockResolvedValue([
      {id: 'org_abc', name: 'My Organization', slug: 'my-org', role: 'ADMIN'},
    ])

    mockCreateApiKeyFromToken.mockResolvedValue({
      apiKey: 'dt_live_newkey123',
      organizationId: 'org_abc',
      organizationName: 'My Organization',
    })

    return {closeFn}
  }

  it('errors in non-interactive mode without --api-key', async () => {
    const originalIsTTY = process.stderr.isTTY
    process.stderr.isTTY = false
    const exitSpy = vi.spyOn(Login.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    try {
      await expect(Login.run(['--json'])).rejects.toThrow('EXIT')
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('Non-interactive mode requires --api-key'),
      )
    } finally {
      process.stderr.isTTY = originalIsTTY
      exitSpy.mockRestore()
    }
  })

  it('skips OAuth flow when --api-key flag is provided', async () => {
    setupOAuthMocks()

    await Login.run(['--api-key', 'dt_live_test123'])
    // With --api-key flag, it goes directly to loginWithApiKey
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_test123'}),
    )
    expect(mockStartCallbackServer).not.toHaveBeenCalled()
  })

  it('executes full OAuth flow and saves org info to config', async () => {
    const {closeFn} = setupOAuthMocks()

    mockStartCallbackServer.mockResolvedValue({
      port: 9876,
      close: closeFn,
      waitForCallback: vi.fn().mockResolvedValue({code: 'auth-code', state: 'fixed-state-123'}),
    })

    const originalIsTTY = process.stderr.isTTY
    process.stderr.isTTY = true

    // Set readline mock to answer 'n' (no API key → OAuth flow)
    const {__setNextAnswer} = await import('node:readline') as any
    __setNextAnswer('n')

    try {
      await Login.run([])

      expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
        'auth-code',
        'test-verifier',
        'http://localhost:9876/callback',
        undefined,
      )
      expect(mockFetchOrganizations).toHaveBeenCalledWith('oauth-token-123', undefined)
      expect(mockCreateApiKeyFromToken).toHaveBeenCalledWith('oauth-token-123', 'org_abc', undefined)
      expect(mockWriteConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'dt_live_newkey123',
          organizationId: 'org_abc',
          organizationName: 'My Organization',
        }),
      )
      expect(closeFn).toHaveBeenCalled()
    } finally {
      process.stderr.isTTY = originalIsTTY
    }
  })
})
