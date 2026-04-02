import {Args, Command} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson} from '../../output.js'

export default class StepsStatus extends Command {
  static args = {
    'execution-id': Args.string({description: 'Step execution ID to query', required: true}),
  }

  static description = 'Query the status of a step execution'

  static examples = [
    '$ docutray steps status abc-123',
  ]

  async run(): Promise<void> {
    try {
      const {args} = await this.parse(StepsStatus)
      const client = createClient()
      const result = await client.steps.getStatus(args['execution-id'])
      outputJson(result)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
