import {Args, Flags} from '@oclif/core'
import * as readline from 'node:readline'

import {BaseCommand} from '../base-command.js'
import {getConfigPath, maskApiKey, readConfig, writeConfig} from '../config.js'
import {outputError, outputSuccess, setForceJson} from '../output.js'

export default class Login extends BaseCommand {
  static args = {
    'api-key': Args.string({description: 'API key to save (omit for interactive prompt)', required: false}),
  }

  static description = `Configure your DocuTray API key for authentication. When called without arguments, prompts interactively for the key (the only interactive command in this CLI). You can also pass the key directly as an argument for non-interactive use. Credentials are stored in ~/.config/docutray/config.json with restricted file permissions.`

  static examples = [
    {command: '<%= config.bin %> login', description: 'Interactive login \u2014 prompts for your API key'},
    {command: '<%= config.bin %> login dt_live_abc123', description: 'Non-interactive login with API key as argument'},
    {command: '<%= config.bin %> login --base-url https://staging.docutray.com', description: 'Login with a custom API base URL (e.g. staging)'},
    {command: 'DOCUTRAY_API_KEY=dt_live_abc123 docutray status', description: 'Alternative: use env var instead of login (recommended for CI/CD)'},
  ]

  static flags = {
    'base-url': Flags.string({description: 'Custom base URL for the DocuTray API (default: https://app.docutray.com)'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Login)
    setForceJson(flags.json)

    try {
      let apiKey = args['api-key']
      if (!apiKey) {
        apiKey = await new Promise<string>((resolve) => {
          process.stderr.write('Enter your DocuTray API key: ')
          const rl = readline.createInterface({input: process.stdin, terminal: false})
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(true)
          }

          let input = ''
          process.stdin.resume()
          process.stdin.on('data', (data: Buffer) => {
            const char = data.toString()
            if (char === '\n' || char === '\r') {
              if (process.stdin.isTTY) {
                process.stdin.setRawMode(false)
              }

              process.stderr.write('\n')
              rl.close()
              resolve(input)
            } else if (char === '\u007F' || char === '\b') {
              input = input.slice(0, -1)
            } else {
              input += char
            }
          })
        })
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

      const data = {
        message: 'Login successful',
        apiKey: maskApiKey(config.apiKey),
        configPath: getConfigPath(),
        ...(config.baseUrl && {baseUrl: config.baseUrl}),
      }

      outputSuccess(data, `Login successful (${maskApiKey(config.apiKey)})`)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
