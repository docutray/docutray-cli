import {Args, Flags} from '@oclif/core'
import * as crypto from 'node:crypto'
import * as readline from 'node:readline'

import {BaseCommand} from '../base-command.js'
import {type Config, getConfigPath, maskApiKey, readConfig, writeConfig} from '../config.js'
import {
  buildAuthorizeUrl,
  createApiKeyFromToken,
  exchangeCodeForToken,
  fetchOrganizations,
  generatePKCE,
  startCallbackServer,
} from '../oauth.js'
import {isStderrInteractive, outputError, outputSuccess, setForceJson} from '../output.js'
import {validateApiKey} from '../validators.js'

interface OAuthLoginOptions {
  openBrowser: boolean
  timeoutMs: number
}

const DEFAULT_OAUTH_TIMEOUT_SECONDS = 180
const TTY_MENU_OAUTH_TIMEOUT_MS = 120_000

export default class Login extends BaseCommand {
  static args = {
    'api-key': Args.string({description: 'API key to save (omit for interactive prompt)', required: false}),
  }

  static description = `Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. For non-interactive shells (CI, AI coding agents), use --oauth to drive the OAuth flow end-to-end without a TTY: the CLI prints the authorization URL on stderr, opens your browser, waits for the callback, and writes the resulting API key to ~/.config/docutray/config.json.`

  static examples = [
    {command: '<%= config.bin %> login', description: 'Interactive login — choose API key or OAuth2 browser login'},
    {command: '<%= config.bin %> login --oauth', description: 'Login via OAuth in the browser (works in agents/CI without a TTY)'},
    {command: '<%= config.bin %> login --oauth --no-browser', description: 'Print the OAuth URL but do not open the browser'},
    {command: '<%= config.bin %> login dt_live_abc123', description: 'Non-interactive login with API key as argument'},
    {command: '<%= config.bin %> login --api-key dt_live_abc123', description: 'Non-interactive login with API key flag'},
    {command: '<%= config.bin %> login --base-url https://staging.docutray.com', description: 'Login with a custom API base URL'},
    {command: 'DOCUTRAY_API_KEY=dt_live_abc123 docutray status', description: 'Alternative: use env var instead of login'},
  ]

  static flags = {
    'api-key': Flags.string({description: 'API key for non-interactive login'}),
    'base-url': Flags.string({description: 'Custom base URL for the DocuTray API (default: https://app.docutray.com)'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    'no-browser': Flags.boolean({default: false, description: 'Skip opening the browser; print the URL only (--oauth only)'}),
    oauth: Flags.boolean({default: false, description: 'Login via OAuth in the browser (works without a TTY)'}),
    timeout: Flags.integer({default: DEFAULT_OAUTH_TIMEOUT_SECONDS, description: 'OAuth callback timeout in seconds (--oauth only)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Login)
    setForceJson(flags.json)

    try {
      const config = readConfig()
      // Reset baseUrl on login: use the flag value, or clear it to default to production.
      // This prevents stale baseUrl from previous sessions leaking into new logins.
      if (flags['base-url']) {
        config.baseUrl = flags['base-url']
      } else {
        delete config.baseUrl
      }

      // Determine API key from arg or flag (non-interactive paths)
      const directApiKey = args['api-key'] || flags['api-key']

      if (flags.oauth && directApiKey) {
        throw new Error('--oauth cannot be combined with an api-key argument or --api-key flag')
      }

      if (directApiKey) {
        const apiKey = validateApiKey(directApiKey)
        await this.loginWithApiKey(apiKey, config)
        return
      }

      if (flags.oauth) {
        await this.loginWithOAuth(config, {
          openBrowser: !flags['no-browser'],
          timeoutMs: flags.timeout * 1000,
        })
        return
      }

      // Interactive: ask user if they have an API key
      if (!isStderrInteractive()) {
        outputError(new Error('Non-interactive mode requires --api-key, an api-key argument, or --oauth.'))
        this.exit(1)
        return
      }

      const hasKey = await this.promptYesNo('Do you already have an API key? (y/N): ')

      if (hasKey) {
        const rawKey = await this.promptHidden('Enter your DocuTray API key: ')
        if (!rawKey?.trim()) {
          outputError(new Error('API key cannot be empty'))
          this.exit(1)
          return
        }

        const apiKey = validateApiKey(rawKey)
        await this.loginWithApiKey(apiKey, config)
      } else {
        await this.loginWithOAuth(config, {openBrowser: true, timeoutMs: TTY_MENU_OAUTH_TIMEOUT_MS})
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }

  private async loginWithApiKey(apiKey: string, config: Config): Promise<void> {
    config.apiKey = apiKey
    delete config.organizationId
    delete config.organizationName
    writeConfig(config)

    const data = {
      message: 'Login successful',
      apiKey: maskApiKey(apiKey),
      configPath: getConfigPath(),
      ...(config.baseUrl ? {baseUrl: config.baseUrl} : {}),
    }

    outputSuccess(data, `Login successful (${maskApiKey(apiKey)})`)
  }

  private async loginWithOAuth(config: Config, opts: OAuthLoginOptions): Promise<void> {
    const {codeChallenge, codeVerifier} = generatePKCE()
    const state = crypto.randomUUID()

    const {close, port, waitForCallback} = await startCallbackServer()

    // Cleanup on signal so the bound socket doesn't linger and block subsequent logins.
    const onSignal = (signal: NodeJS.Signals) => {
      close()
      process.removeListener('SIGINT', onSignal)
      process.removeListener('SIGTERM', onSignal)
      // Re-emit the default behavior: exit non-zero with the conventional signal code.
      // Using kill on self preserves shell exit-code semantics ($? = 128+signo).
      process.kill(process.pid, signal)
    }

    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)

    try {
      const authorizeUrl = buildAuthorizeUrl(port, state, codeChallenge, config.baseUrl)

      // Agent-detectable URL line first, before any other status output.
      process.stderr.write(`Open this URL to authorize: ${authorizeUrl}\n`)

      if (opts.openBrowser) {
        try {
          const {default: open} = await import('open')
          await open(authorizeUrl)
          process.stderr.write('Opening browser for authentication...\n')
        } catch {
          // Browser open is best-effort. The URL is already on stderr above.
        }
      }

      const timeoutSeconds = Math.round(opts.timeoutMs / 1000)
      process.stderr.write(`Waiting for authentication (timeout: ${timeoutSeconds}s)...\n`)

      const result = await waitForCallback(opts.timeoutMs)

      // Validate state to prevent CSRF
      if (result.state !== state) {
        throw new Error('State parameter mismatch — possible CSRF attack. Please try again.')
      }

      // Must match the value in buildAuthorizeUrl (and the dashboard allowlist).
      const redirectUri = `http://localhost:${port}/callback`

      // Exchange authorization code for access token
      process.stderr.write('Exchanging authorization code...\n')
      const tokenResponse = await exchangeCodeForToken(result.code, codeVerifier, redirectUri, config.baseUrl)

      // Fetch user's organizations using the access token
      process.stderr.write('Fetching organizations...\n')
      const organizations = await fetchOrganizations(tokenResponse.access_token, config.baseUrl)

      if (organizations.length === 0) {
        throw new Error('No organizations found. Create an organization in DocuTray first.')
      }

      // Use first org (future: prompt user to choose if multiple)
      const org = organizations[0]!
      if (organizations.length > 1) {
        process.stderr.write(`Multiple organizations found, using: ${org.name}\n`)
      }

      // Create API key from OAuth token
      process.stderr.write('Creating API key...\n')
      const apiKeyResponse = await createApiKeyFromToken(tokenResponse.access_token, org.id, config.baseUrl)

      // Save to config
      config.apiKey = apiKeyResponse.apiKey
      config.organizationId = apiKeyResponse.organizationId
      config.organizationName = apiKeyResponse.organizationName
      writeConfig(config)

      const data = {
        message: 'Login successful',
        apiKey: maskApiKey(apiKeyResponse.apiKey),
        organizationId: apiKeyResponse.organizationId,
        organizationName: apiKeyResponse.organizationName,
        configPath: getConfigPath(),
      }

      outputSuccess(
        data,
        `Login successful — ${apiKeyResponse.organizationName} (${maskApiKey(apiKeyResponse.apiKey)})`,
      )
    } finally {
      process.removeListener('SIGINT', onSignal)
      process.removeListener('SIGTERM', onSignal)
      close()
    }
  }

  private promptHidden(prompt: string): Promise<string> {
    return new Promise<string>((resolve) => {
      process.stderr.write(prompt)
      const rl = readline.createInterface({input: process.stdin, terminal: false})
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
      }

      let input = ''
      const onData = (data: Buffer) => {
        const char = data.toString()
        if (char === '\n' || char === '\r') {
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false)
          }

          process.stdin.removeListener('data', onData)
          process.stdin.pause()
          process.stderr.write('\n')
          rl.close()
          resolve(input)
        } else if (char === '\u007F' || char === '\b') {
          input = input.slice(0, -1)
        } else {
          input += char
        }
      }

      process.stdin.resume()
      process.stdin.on('data', onData)
    })
  }

  private promptYesNo(prompt: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      process.stderr.write(prompt)
      const rl = readline.createInterface({input: process.stdin, terminal: false})
      rl.on('line', (line: string) => {
        rl.close()
        resolve(line.trim().toLowerCase() === 'y')
      })
    })
  }
}
