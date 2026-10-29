import {Page} from 'docutray'
import {vi} from 'vitest'

/** Real SDK pagination with an API that caps pages at the supplied size. */
export function mockPage<T>(data: T[], laterPages: T[][] = []) {
  const pages = [data, ...laterPages]
  const total = pages.reduce((sum, page) => sum + page.length, 0)
  const limit = data.length || 1
  const response = (page: number) => ({data: pages[page - 1]!, pagination: {page, limit, total}})
  const get = vi.fn(async (_path: string, options: {query: {page: number}}) => response(options.query.page))
  return new Page(response(1), {client: {get} as never, path: '/api/document-types'})
}
