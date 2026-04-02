import {Command} from '@oclif/core'

import {getApiKey, getBaseUrl, getConfigPath, maskApiKey, readConfig} from '../config.js'
import {outputError, outputJson} from '../output.js'

export default class Status extends Command {
  static description = 'Show current authentication status and configuration'

  static examples = ['$ docutray status']

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
