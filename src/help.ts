import {Command} from '@oclif/core'
import {CommandHelp, Help as DefaultHelp} from '@oclif/core/help'

const DOCS_BASE_URL = 'https://docs.docutray.com/cli'

class DocuTrayCommandHelp extends CommandHelp {
  protected sections() {
    const sections = super.sections()
    const commandId = this.command.id

    sections.push({
      generate: () => `Learn more: ${DOCS_BASE_URL}/${commandId.replaceAll(':', '/').replaceAll(' ', '/')}`,
      header: 'DOCUMENTATION',
    })

    return sections
  }
}

export default class DocuTrayHelp extends DefaultHelp {
  protected CommandHelpClass = DocuTrayCommandHelp as typeof CommandHelp

  protected formatRoot(): string {
    const output = [
      'DocuTray CLI — AI-powered document processing from the command line.\n',
      'Authenticate, manage document types, convert documents to structured data,',
      'and identify document types. Designed for AI agents and automation.\n',
      super.formatRoot(),
      '',
      `Documentation: ${DOCS_BASE_URL}`,
      'Dashboard:     https://app.docutray.com',
    ]

    return output.join('\n')
  }

  protected formatCommand(command: Command.Loadable): string {
    return this.getCommandHelpClass(command).generate()
  }
}
