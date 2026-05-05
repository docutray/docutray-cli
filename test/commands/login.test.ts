import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

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
    await Login.run(['--api-key', 'dt_live_abc1234567890ABCDEF'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_abc1234567890ABCDEF'}),
    )
  })

  it('saves API key from positional argument', async () => {
    await Login.run(['dt_live_abc1234567890ABCDEF'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_abc1234567890ABCDEF'}),
    )
  })

  it('outputs success with masked key', async () => {
    await Login.run(['dt_live_abc1234567890ABCDEF', '--json'])
    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    const parsed = JSON.parse(output)
    expect(parsed.message).toBe('Login successful')
    expect(parsed.apiKey).toContain('****')
  })

  it('saves base-url when provided', async () => {
    await Login.run(['--api-key', 'dt_live_abc1234567890ABCDEF', '--base-url', 'https://staging.docutray.com'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'dt_live_abc1234567890ABCDEF',
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

    await Login.run(['--api-key', 'dt_live_test123456789ABCDEF'])
    // With --api-key flag, it goes directly to loginWithApiKey
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_test123456789ABCDEF'}),
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

describe('login --oauth (non-interactive OAuth)', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>
  let originalIsTTY: boolean | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(Login.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
    originalIsTTY = process.stderr.isTTY
    process.stderr.isTTY = false
  })

  afterEach(() => {
    process.stderr.isTTY = originalIsTTY as any
    exitSpy.mockRestore()
  })

  function happyPathOAuthMocks() {
    const closeFn = vi.fn()
    mockStartCallbackServer.mockResolvedValue({
      port: 54321,
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

  it('completes OAuth from non-TTY shell, writes config, prints JSON to stdout', async () => {
    const {closeFn} = happyPathOAuthMocks()

    await Login.run(['--oauth', '--json'])

    expect(mockStartCallbackServer).toHaveBeenCalled()
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'dt_live_newkey123',
        organizationId: 'org_abc',
        organizationName: 'My Organization',
      }),
    )
    expect(closeFn).toHaveBeenCalled()

    const stdoutOutput = stdoutSpy.mock.calls.map((c) => c[0] as string).join('')
    const parsed = JSON.parse(stdoutOutput)
    expect(parsed.message).toBe('Login successful')
    expect(parsed.organizationName).toBe('My Organization')
    expect(parsed.apiKey).toContain('****')

    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('Open this URL to authorize:')
  })

  it('--oauth uses localhost for the redirect_uri sent to token exchange', async () => {
    happyPathOAuthMocks()
    await Login.run(['--oauth'])
    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      'auth-code',
      'test-verifier',
      'http://localhost:54321/callback',
      undefined,
    )
  })

  it('--oauth opens browser by default', async () => {
    happyPathOAuthMocks()
    const openMod = (await import('open')) as unknown as {default: ReturnType<typeof vi.fn>}
    openMod.default.mockClear()

    await Login.run(['--oauth'])

    expect(openMod.default).toHaveBeenCalledTimes(1)
  })

  it('--oauth --no-browser does not call open but still prints URL', async () => {
    happyPathOAuthMocks()
    const openMod = (await import('open')) as unknown as {default: ReturnType<typeof vi.fn>}
    openMod.default.mockClear()

    await Login.run(['--oauth', '--no-browser'])

    expect(openMod.default).not.toHaveBeenCalled()
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('Open this URL to authorize:')
  })

  it('--oauth times out and exits non-zero without writing config', async () => {
    const closeFn = vi.fn()
    mockStartCallbackServer.mockResolvedValue({
      port: 54321,
      close: closeFn,
      waitForCallback: vi.fn().mockRejectedValue(new Error('Authentication timed out after 1s. Please try again.')),
    })

    await expect(Login.run(['--oauth', '--timeout', '1', '--json'])).rejects.toThrow('EXIT')

    expect(mockWriteConfig).not.toHaveBeenCalled()
    expect(closeFn).toHaveBeenCalled()
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toMatch(/timed out/i)
  })

  it('--oauth surfaces callback error and does not write config', async () => {
    const closeFn = vi.fn()
    mockStartCallbackServer.mockResolvedValue({
      port: 54321,
      close: closeFn,
      waitForCallback: vi.fn().mockRejectedValue(new Error('OAuth error: User denied access')),
    })

    await expect(Login.run(['--oauth', '--json'])).rejects.toThrow('EXIT')

    expect(mockWriteConfig).not.toHaveBeenCalled()
    expect(closeFn).toHaveBeenCalled()
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('User denied access')
  })

  it('--oauth combined with --api-key is rejected up front', async () => {
    await expect(Login.run(['--oauth', '--api-key', 'dt_live_abc1234567890ABCDEF'])).rejects.toThrow('EXIT')
    expect(mockStartCallbackServer).not.toHaveBeenCalled()
    expect(mockWriteConfig).not.toHaveBeenCalled()
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('--oauth cannot be combined')
  })

  it('--oauth combined with positional api-key is rejected up front', async () => {
    await expect(Login.run(['--oauth', 'dt_live_abc1234567890ABCDEF'])).rejects.toThrow('EXIT')
    expect(mockStartCallbackServer).not.toHaveBeenCalled()
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })

  it('non-interactive shell with no flags errors with the new message including --oauth', async () => {
    await expect(Login.run(['--json'])).rejects.toThrow('EXIT')
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('--api-key')
    expect(stderrOutput).toContain('--oauth')
    expect(stderrOutput).toContain('an api-key argument')
  })
})

describe('login API key validation', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(Login.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('accepts a real-looking key via positional arg (regression)', async () => {
    await Login.run(['dt_live_REAL_LOOKING_KEY_0123'])
    expect(mockWriteConfig).toHaveBeenCalledWith(
      expect.objectContaining({apiKey: 'dt_live_REAL_LOOKING_KEY_0123'}),
    )
  })

  it('rejects garbage positional arg without writing config', async () => {
    await expect(Login.run(['2'])).rejects.toThrow('EXIT')
    expect(mockWriteConfig).not.toHaveBeenCalled()
    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0] as string).join('')
    expect(stderrOutput).toContain('Invalid API key format')
  })

  it('rejects wrong-prefix --api-key value without writing config', async () => {
    await expect(Login.run(['--api-key', 'sk_live_abcDEF0123456789abc'])).rejects.toThrow('EXIT')
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })

  it('rejects empty --api-key value without writing config', async () => {
    await expect(Login.run(['--api-key', ''])).rejects.toThrow('EXIT')
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })
})

describe('login --help (static metadata)', () => {
  it('exposes --oauth, --no-browser, --timeout flags', () => {
    const flags = Login.flags as Record<string, unknown>
    expect(flags).toHaveProperty('oauth')
    expect(flags).toHaveProperty('no-browser')
    expect(flags).toHaveProperty('timeout')
  })

  it('includes an example invoking docutray login --oauth', () => {
    const examples = Login.examples as Array<{command: string; description: string}>
    const oauthExample = examples.find((e) => /login --oauth(?!\s*--no-browser)/.test(e.command))
    expect(oauthExample).toBeDefined()
  })

  it('description mentions OAuth as the agent-friendly path', () => {
    expect(Login.description).toMatch(/--oauth/)
  })
})
