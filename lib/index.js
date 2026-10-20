import { credentialRef } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';
import { LiquidClient } from "./client.js";
import { createTools } from "./tools.js";
export const name = 'liquid-inference';
/**
 * `credentials` is optional: headless profiles disable the credential store, and
 * a hard dependency left the tools pending forever. Without it the key comes
 * from the process environment.
 */
export const inject = ['tools'];
export const Config = z.object({
    baseURL: z.string().default('https://router.inference.ai.exchange'),
    apiKeyEnv: z.string().default('LIQUID_API_KEY'),
});
export function apply(ctx, config) {
    const ref = credentialRef(config.apiKeyEnv);
    const client = new LiquidClient({
        baseURL: config.baseURL,
        getApiKey: async () => {
            const stored = await ctx.get('credentials')?.resolve(ref);
            return stored?.value || process.env[config.apiKeyEnv] || undefined;
        },
    });
    for (const tool of createTools(client))
        ctx.tools.register(tool);
}
