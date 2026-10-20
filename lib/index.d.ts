import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "liquid-inference";
/**
 * `credentials` is optional: headless profiles disable the credential store, and
 * a hard dependency left the tools pending forever. Without it the key comes
 * from the process environment.
 */
export declare const inject: string[];
export interface Config {
    /** Exchange origin used by the market tools. The model route's endpoint is set in cordis.patch.yml. */
    baseURL: string;
    /** Credential reference holding the buyer key. */
    apiKeyEnv: string;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
