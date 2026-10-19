import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { LiquidClient } from './client.ts'
import { createTools } from './tools.ts'

export const name = 'liquid-inference'
/**
 * `credentials` is optional: headless profiles disable the credential store, and
 * a hard dependency left the tools pending forever. Without it the key comes
 * from the process environment.
 */
export const inject = ['tools']

export interface Config {
  /** Exchange origin used by the market tools. The model route's endpoint is set in cordis.patch.yml. */
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
    getApiKey: async () => {
      const stored = await ctx.get('credentials')?.resolve(ref)
      return stored?.value || process.env[config.apiKeyEnv] || undefined
    },
  })
  for (const tool of createTools(client)) ctx.tools.register(tool)
}
