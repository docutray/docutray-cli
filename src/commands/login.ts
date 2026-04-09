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

export default class Login extends BaseCommand {
  static args = {
    'api-key': Args.string({description: 'API key to save (omit for interactive prompt)', required: false}),
  }

  static description = `Configure your DocuTray API key for authentication. When called without arguments, prompts to choose between pasting an existing API key or authenticating via OAuth2 in the browser. OAuth2 login opens your browser, lets you select an organization, and automatically generates an API key. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.`

  static examples = [
    {command: '<%= config.bin %> login', description: 'Interactive login — choose API key or OAuth2 browser login'},
    {command: '<%= config.bin %> login dt_live_abc123', description: 'Non-interactive login with API key as argument'},
    {command: '<%= config.bin %> login --api-key dt_live_abc123', description: 'Non-interactive login with API key flag'},
    {command: '<%= config.bin %> login --base-url https://staging.docutray.com', description: 'Login with a custom API base URL'},
    {command: 'DOCUTRAY_API_KEY=dt_live_abc123 docutray status', description: 'Alternative: use env var instead of login'},
  ]

  static flags = {
    'api-key': Flags.string({description: 'API key for non-interactive login'}),
    'base-url': Flags.string({description: 'Custom base URL for the DocuTray API (default: https://app.docutray.com)'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
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

      if (directApiKey) {
        await this.loginWithApiKey(directApiKey.trim(), config)
        return
      }

      // Interactive: ask user if they have an API key
      if (!isStderrInteractive()) {
        outputError(new Error('Non-interactive mode requires --api-key flag or api-key argument'))
        this.exit(1)
        return
      }

      const hasKey = await this.promptYesNo('Do you already have an API key? (y/N): ')

      if (hasKey) {
        const apiKey = await this.promptHidden('Enter your DocuTray API key: ')
        if (!apiKey?.trim()) {
          outputError(new Error('API key cannot be empty'))
          this.exit(1)
          return
        }

        await this.loginWithApiKey(apiKey.trim(), config)
      } else {
        await this.loginWithOAuth(config)
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

  private async loginWithOAuth(config: Config): Promise<void> {
    const {codeChallenge, codeVerifier} = generatePKCE()
    const state = crypto.randomUUID()

    const {close, port, waitForCallback} = await startCallbackServer()

    try {
      const authorizeUrl = buildAuthorizeUrl(port, state, codeChallenge, config.baseUrl)

      process.stderr.write('Opening browser for authentication...\n')
      process.stderr.write(`If the browser does not open, visit:\n${authorizeUrl}\n\n`)

      // Dynamic import for ESM-only 'open' package
      const {default: open} = await import('open')
      await open(authorizeUrl)

      process.stderr.write('Waiting for authentication (timeout: 120s)...\n')

      const result = await waitForCallback()

      // Validate state to prevent CSRF
      if (result.state !== state) {
        throw new Error('State parameter mismatch — possible CSRF attack. Please try again.')
      }

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
