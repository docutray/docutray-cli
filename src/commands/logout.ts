import {Command, Flags} from '@oclif/core'

import {deleteConfig} from '../config.js'
import {outputError, outputSuccess, setForceJson} from '../output.js'

export default class Logout extends Command {
  static description = `Clear stored credentials by removing the local configuration file. This does not invalidate the API key itself \u2014 it only removes it from this machine. Has no effect if you are authenticating via the DOCUTRAY_API_KEY environment variable.`

  static examples = [
    {command: '<%= config.bin %> logout', description: 'Remove stored API key from local config'},
    {command: '<%= config.bin %> logout && docutray status', description: 'Logout and verify authentication is cleared'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Logout)
      setForceJson(flags.json)

      deleteConfig()
      outputSuccess({message: 'Logged out successfully'}, 'Logged out successfully')
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
