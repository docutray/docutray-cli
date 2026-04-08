import * as crypto from 'node:crypto'
import * as http from 'node:http'

import {getBaseUrl} from './config.js'

const CLIENT_ID = 'docutray-cli'
const DEFAULT_BASE_URL = 'https://app.docutray.com'
const OAUTH_TIMEOUT_MS = 120_000

export interface PKCEChallenge {
  codeChallenge: string
  codeVerifier: string
}

export interface CallbackResult {
  code: string
  state: string
}

export interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type: string
}

export interface ApiKeyResponse {
  apiKey: string
  organizationId: string
  organizationName: string
}

export function generatePKCE(): PKCEChallenge {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return {codeChallenge, codeVerifier}
}

export function buildAuthorizeUrl(port: number, state: string, codeChallenge: string, baseUrl?: string): string {
  const resolvedBaseUrl = baseUrl || getBaseUrl() || DEFAULT_BASE_URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: `http://127.0.0.1:${port}`,
    response_type: 'code',
    scope: 'openid',
    state,
  })
  return `${resolvedBaseUrl}/api/auth/oauth2/authorize?${params.toString()}`
}

export async function startCallbackServer(): Promise<{
  port: number
  close: () => void
  waitForCallback: (timeout?: number) => Promise<CallbackResult>
}> {
  let resolveCallback: (result: CallbackResult) => void
  let rejectCallback: (error: Error) => void

  const callbackPromise = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve
    rejectCallback = reject
  })

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost`)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      const description = url.searchParams.get('error_description') || error
      res.writeHead(200, {'Content-Type': 'text/html'})
      res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>')
      rejectCallback(new Error(`OAuth error: ${description}`))
      return
    }

    if (!code || !state) {
      // Ignore requests without OAuth params (e.g. browser favicon.ico)
      res.writeHead(404)
      res.end()
      return
    }

    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window and return to the terminal.</p></body></html>')
    resolveCallback({code, state})
  })

  const port = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })

  return {
    close: () => server.close(),
    port,
    waitForCallback: (timeout = OAUTH_TIMEOUT_MS) => {
      const timer = setTimeout(() => {
        rejectCallback(new Error(`Authentication timed out after ${timeout / 1000}s. Please try again.`))
      }, timeout)

      return callbackPromise.finally(() => {
        clearTimeout(timer)
      })
    },
  }
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  baseUrl?: string,
): Promise<TokenResponse> {
  const resolvedBaseUrl = baseUrl || getBaseUrl() || DEFAULT_BASE_URL
  const response = await fetch(`${resolvedBaseUrl}/api/auth/oauth2/token`, {
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<TokenResponse>
}

export function extractOrgFromScope(scope: string): string | undefined {
  const match = scope.match(/org:(\S+)/)
  return match?.[1]
}

export async function createApiKeyFromToken(
  accessToken: string,
  organizationId: string,
  baseUrl?: string,
): Promise<ApiKeyResponse> {
  const resolvedBaseUrl = baseUrl || getBaseUrl() || DEFAULT_BASE_URL
  const response = await fetch(`${resolvedBaseUrl}/api/auth/oauth/create-api-key`, {
    body: JSON.stringify({organizationId}),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API key creation failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<ApiKeyResponse>
}
