import * as crypto from 'node:crypto'
import * as http from 'node:http'

import {getBaseUrl} from './config.js'

const CLIENT_ID = 'docutray-cli'
const DEFAULT_BASE_URL = 'https://app.docutray.com'
const OAUTH_CALLBACK_PORT = 9876
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
  id_token?: string
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
  const redirectUri = `http://localhost:${port}/callback`
  // Build query string manually to avoid URL-encoding the redirect_uri,
  // which better-auth does not decode before validating against registered URLs.
  const query = [
    `client_id=${CLIENT_ID}`,
    `response_type=code`,
    `redirect_uri=${redirectUri}`,
    `code_challenge=${codeChallenge}`,
    `code_challenge_method=S256`,
    `scope=openid`,
    `state=${state}`,
  ].join('&')
  return `${resolvedBaseUrl}/api/auth/oauth2/authorize?${query}`
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

    // Only process requests to /callback, ignore everything else (favicon.ico, etc.)
    if (url.pathname !== '/callback') {
      res.writeHead(404)
      res.end()
      return
    }

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      const description = url.searchParams.get('error_description') || error
      res.writeHead(200, {'Connection': 'close', 'Content-Type': 'text/html'})
      res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>')
      rejectCallback(new Error(`OAuth error: ${description}`))
      return
    }

    if (!code || !state) {
      res.writeHead(400, {'Connection': 'close', 'Content-Type': 'text/html'})
      res.end('<html><body><h1>Invalid callback</h1><p>Missing code or state parameter.</p></body></html>')
      return
    }

    res.writeHead(200, {'Connection': 'close', 'Content-Type': 'text/html'})
    res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window and return to the terminal.</p></body></html>')
    resolveCallback({code, state})
  })

  const port = await new Promise<number>((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${OAUTH_CALLBACK_PORT} is already in use. Close the process using it and try again.`))
      } else {
        reject(err)
      }
    })
    server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      resolve(OAUTH_CALLBACK_PORT)
    })
  })

  return {
    close: () => {
      // Force-close any lingering sockets (e.g. browser keep-alive) so the
      // event loop can drain and the CLI process exits promptly. Without this,
      // server.close() waits for existing connections to close on their own,
      // which can hang for a long time after a successful OAuth callback.
      server.closeAllConnections()
      server.close()
    },
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

export interface OAuthOrganization {
  id: string
  name: string
  slug: string | null
  role: string
}

export async function fetchOrganizations(
  accessToken: string,
  baseUrl?: string,
): Promise<OAuthOrganization[]> {
  const resolvedBaseUrl = baseUrl || getBaseUrl() || DEFAULT_BASE_URL
  const response = await fetch(`${resolvedBaseUrl}/api/auth/oauth/organizations`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    method: 'GET',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch organizations (${response.status}): ${text}`)
  }

  const data = await response.json() as {organizations: OAuthOrganization[]}
  return data.organizations
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
