import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputKeyValue, setForceJson} from '../../output.js'
import {resolveDocumentTypeId} from '../../resolve-type.js'

export default class TypesGet extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.`

  static examples = [
    {command: '<%= config.bin %> types get electronic-invoice', description: 'Get full details of a document type'},
    {command: '<%= config.bin %> types get electronic-invoice --json', description: 'Output full JSON (includes field schema)'},
    {command: '<%= config.bin %> types get electronic-invoice | jq .fields', description: 'Extract just the field schema (useful for scripts)'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesGet)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.get(id)

      outputKeyValue(result, [
        {key: 'Code', value: result.codeType},
        {key: 'Name', value: result.name},
        {key: 'Description', value: result.description || '(none)'},
        {key: 'Public', value: result.isPublic ? 'yes' : 'no'},
        {key: 'Draft', value: result.isDraft ? 'yes' : 'no'},
        {key: 'Fields', value: `${('fields' in result && Array.isArray(result.fields) ? result.fields.length : 0)} fields`},
      ])
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
