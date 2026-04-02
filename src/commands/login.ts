import {Args, Command, Flags} from '@oclif/core'
import * as readline from 'node:readline/promises'

import {getConfigPath, maskApiKey, readConfig, writeConfig} from '../config.js'
import {outputError, outputJson} from '../output.js'

export default class Login extends Command {
  static args = {
    'api-key': Args.string({description: 'API key to save (omit for interactive prompt)', required: false}),
  }

  static description = 'Configure API key for authentication'

  static examples = [
    '$ docutray login',
    '$ docutray login dt_my-api-key',
    '$ docutray login --base-url https://staging.docutray.com',
  ]

  static flags = {
    'base-url': Flags.string({description: 'Custom base URL for the API'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Login)

      let apiKey = args['api-key']
      if (!apiKey) {
        const rl = readline.createInterface({input: process.stdin, output: process.stderr})
        apiKey = await rl.question('Enter your DocuTray API key: ')
        rl.close()
      }

      if (!apiKey?.trim()) {
        outputError(new Error('API key cannot be empty'))
        this.exit(1)
      }

      const config = readConfig()
      config.apiKey = apiKey.trim()
      if (flags['base-url']) {
        config.baseUrl = flags['base-url']
      }

      writeConfig(config)

      outputJson({
        message: 'Login successful',
        apiKey: maskApiKey(config.apiKey),
        configPath: getConfigPath(),
        ...(config.baseUrl && {baseUrl: config.baseUrl}),
      })
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
