import {Command} from '@oclif/core'

import {deleteConfig} from '../config.js'
import {outputError, outputJson} from '../output.js'

export default class Logout extends Command {
  static description = 'Clear stored credentials'

  static examples = ['$ docutray logout']

  async run(): Promise<void> {
    try {
      deleteConfig()
      outputJson({message: 'Logged out successfully'})
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
