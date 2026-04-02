import DocuTray from 'docutray'

import {getApiKey, getBaseUrl} from './config.js'

export function createClient(): DocuTray {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('No API key configured. Run "docutray login" or set DOCUTRAY_API_KEY environment variable.')
  }

  const options: {apiKey: string; baseURL?: string} = {apiKey}
  const baseUrl = getBaseUrl()
  if (baseUrl) {
    options.baseURL = baseUrl
  }

  return new DocuTray(options)
}
