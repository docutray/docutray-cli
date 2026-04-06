import {Flags} from '@oclif/core'

import {BaseCommand} from '../base-command.js'
import {getApiKey, getBaseUrl, getConfigPath, maskApiKey, readConfig} from '../config.js'
import {outputError, outputKeyValue, setForceJson} from '../output.js'

export default class Status extends BaseCommand {
  static description = `Show current authentication status and configuration. Displays whether you are authenticated, the masked API key, the credential source (environment variable or config file), the API base URL, and the config file path. Useful for verifying your setup before running commands.`

  static examples = [
    {command: '<%= config.bin %> status', description: 'Check current authentication status'},
    {command: '<%= config.bin %> status --json', description: 'Output as JSON (default when piped)'},
    {command: 'DOCUTRAY_API_KEY=dt_live_abc123 docutray status', description: 'Verify env var authentication is detected'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Status)
    setForceJson(flags.json)

    try {
      const apiKey = getApiKey()
      const baseUrl = getBaseUrl()
      const config = readConfig()
      const source = process.env.DOCUTRAY_API_KEY ? 'environment' : config.apiKey ? 'config' : 'none'
      const authenticated = Boolean(apiKey)

      const data = {
        authenticated,
        apiKey: apiKey ? maskApiKey(apiKey) : null,
        source,
        baseUrl: baseUrl || 'https://app.docutray.com',
        configPath: getConfigPath(),
      }

      outputKeyValue(data, [
        {key: 'Authenticated', value: authenticated ? 'yes' : 'no', icon: authenticated ? '\u2713' : '\u2717'},
        {key: 'API Key', value: apiKey ? maskApiKey(apiKey) : 'none'},
        {key: 'Source', value: source === 'environment' ? 'environment variable' : source === 'config' ? 'config file' : 'none'},
        {key: 'Base URL', value: data.baseUrl},
        {key: 'Config', value: getConfigPath()},
      ])
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
