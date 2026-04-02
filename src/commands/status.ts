import {Command} from '@oclif/core'

import {getApiKey, getBaseUrl, getConfigPath, maskApiKey, readConfig} from '../config.js'
import {outputError, outputJson} from '../output.js'

export default class Status extends Command {
  static description = `Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.`

  static examples = [
    {command: '<%= config.bin %> status', description: 'Check current authentication status'},
    {command: '<%= config.bin %> status | jq .authenticated', description: 'Check if authenticated (JSON output, useful for scripts)'},
    {command: 'DOCUTRAY_API_KEY=dt_live_abc123 docutray status', description: 'Verify env var authentication is detected'},
  ]

  async run(): Promise<void> {
    try {
      const apiKey = getApiKey()
      const baseUrl = getBaseUrl()
      const config = readConfig()
      const source = process.env.DOCUTRAY_API_KEY ? 'environment' : config.apiKey ? 'config' : 'none'

      outputJson({
        authenticated: Boolean(apiKey),
        apiKey: apiKey ? maskApiKey(apiKey) : null,
        source,
        baseUrl: baseUrl || 'https://app.docutray.com',
        configPath: getConfigPath(),
      })
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
