import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {Config} from '@oclif/core'
import {fileURLToPath} from 'node:url'
import {resolve, dirname} from 'node:path'
import DocuTrayHelp from '../src/help.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('help output', () => {
  let stdoutData: string
  let config: Config
  let help: DocuTrayHelp

  beforeEach(async () => {
    stdoutData = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((data) => {
      stdoutData += String(data)
      return true
    })
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      stdoutData += args.join(' ') + '\n'
    })

    config = await Config.load({root: resolve(__dirname, '..')})
    help = new DocuTrayHelp(config)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('convert --help output matches snapshot', async () => {
    const cmd = config.findCommand('convert')
    expect(cmd).toBeDefined()
    await help.showCommandHelp(cmd!)

    expect(stdoutData).toContain('Convert a document to structured data')
    expect(stdoutData).toContain('Learn more: https://docs.docutray.com/cli/convert')
    expect(stdoutData).toContain('EXAMPLES')
    expect(stdoutData).toMatchSnapshot()
  })

  it('identify --help output matches snapshot', async () => {
    const cmd = config.findCommand('identify')
    expect(cmd).toBeDefined()
    await help.showCommandHelp(cmd!)

    expect(stdoutData).toContain('Identify the type of a document')
    expect(stdoutData).toContain('Learn more: https://docs.docutray.com/cli/identify')
    expect(stdoutData).toMatchSnapshot()
  })

  it('login --help output matches snapshot', async () => {
    const cmd = config.findCommand('login')
    expect(cmd).toBeDefined()
    await help.showCommandHelp(cmd!)

    expect(stdoutData).toContain('Configure your DocuTray API key')
    expect(stdoutData).toContain('Learn more: https://docs.docutray.com/cli/login')
    expect(stdoutData).toMatchSnapshot()
  })

  it('types:list --help output matches snapshot', async () => {
    const cmd = config.findCommand('types:list')
    expect(cmd).toBeDefined()
    await help.showCommandHelp(cmd!)

    expect(stdoutData).toContain('List available document types')
    expect(stdoutData).toContain('Learn more: https://docs.docutray.com/cli/types/list')
    expect(stdoutData).toMatchSnapshot()
  })

  it('steps:run --help output matches snapshot', async () => {
    const cmd = config.findCommand('steps:run')
    expect(cmd).toBeDefined()
    await help.showCommandHelp(cmd!)

    expect(stdoutData).toContain('Execute a processing step')
    expect(stdoutData).toContain('Learn more: https://docs.docutray.com/cli/steps/run')
    expect(stdoutData).toMatchSnapshot()
  })

  it('all commands have "Learn more" links', async () => {
    const commands = config.commands.filter((c) => !c.hidden)

    for (const cmd of commands) {
      stdoutData = ''
      await help.showCommandHelp(cmd)

      const expectedUrl = `https://docs.docutray.com/cli/${cmd.id.replaceAll(':', '/')}`
      expect(stdoutData, `Command "${cmd.id}" missing Learn more link`).toContain(expectedUrl)
    }
  })
})
