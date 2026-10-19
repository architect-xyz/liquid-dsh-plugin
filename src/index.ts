import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { LiquidClient } from './client.ts'
import { createTools } from './tools.ts'

export const name = 'liquid-inference'
export const inject = ['tools', 'credentials']

export interface Config {
  /** Exchange origin. Also read from LIQUID_BASE_URL by the model route, not here. */
  baseURL: string
  /** Credential reference holding the buyer key. */
  apiKeyEnv: string
}

export const Config: z<Config> = z.object({
  baseURL: z.string().default('https://router.inference.ai.exchange'),
  apiKeyEnv: z.string().default('LIQUID_API_KEY'),
})

export function apply(ctx: Context, config: Config) {
  const ref = credentialRef(config.apiKeyEnv)
  const client = new LiquidClient({
    baseURL: config.baseURL,
    getApiKey: async () => (await ctx.credentials.resolve(ref))?.value,
  })
  for (const tool of createTools(client)) ctx.tools.register(tool)
}
