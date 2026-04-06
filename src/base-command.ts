import {Command, Errors} from '@oclif/core'
import {Help} from '@oclif/core/help'

import {isStderrInteractive, outputError} from './output.js'

export abstract class BaseCommand extends Command {
  protected async catch(err: Error & {code?: string}): Promise<void> {
    const isMissingInput =
      err instanceof Errors.CLIError &&
      (err.message.includes('required arg') ||
        err.message.includes('required flag'))

    if (isMissingInput && isStderrInteractive()) {
      process.stderr.write(`\n\u2717 Error: ${err.message}\n\n`)

      const help = new Help(this.config, {all: false})
      const cmd = this.config.findCommand(this.id!)
      if (cmd) {
        await help.showCommandHelp(cmd)
      }

      this.exit(1)
    }

    if (isMissingInput) {
      outputError(err)
      this.exit(1)
    }

    throw err
  }
}
