import {Command, Errors} from '@oclif/core'

import DocuTrayHelp from './help.js'
import {isStderrInteractive, outputError} from './output.js'

export abstract class BaseCommand extends Command {
  /** Exit code for a missing arg or flag; commands that reserve 1 for another outcome override it. */
  protected inputErrorExitCode = 1

  protected async catch(err: Error & {code?: string}): Promise<void> {
    const isMissingInput =
      err instanceof Errors.CLIError &&
      (err.message.includes('required arg') ||
        err.message.includes('required flag'))

    if (isMissingInput) {
      if (isStderrInteractive()) {
        process.stderr.write(`\n\u2717 Error: ${err.message}\n\n`)

        if (this.id) {
          const help = new DocuTrayHelp(this.config, {all: false})
          const cmd = this.config.findCommand(this.id)
          if (cmd) {
            process.stderr.write(help.getCommandHelpText(cmd) + '\n')
          }
        }
      } else {
        outputError(err)
      }

      this.exit(this.inputErrorExitCode)
      return
    }

    throw err
  }
}
