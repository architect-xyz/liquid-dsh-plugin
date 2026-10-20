/**
 * Thin typed client for the Liquid Inference REST API. Market reads are public;
 * job receipts need a buyer key. Spec: GET {baseURL}/v1/openapi.json.
 */
export interface LiquidClientOptions {
    /** Exchange origin, without a trailing `/v1`. */
    baseURL: string;
    /** Resolves the buyer key per call so rotated keys apply without a restart. */
    getApiKey: () => Promise<string | undefined>;
    fetch?: typeof globalThis.fetch;
}
export declare class LiquidApiError extends Error {
    readonly status: number;
    readonly path: string;
    constructor(status: number, path: string, detail: string);
}
export declare class MissingKeyError extends Error {
    constructor();
}
export declare class LiquidClient {
    private readonly options;
    private readonly base;
    private readonly doFetch;
    constructor(options: LiquidClientOptions);
    /** GET a public market view. */
    market<T = unknown>(path: string, signal?: AbortSignal): Promise<T>;
    /** GET an endpoint that needs the buyer key. */
    authed<T = unknown>(path: string, signal?: AbortSignal): Promise<T>;
    private get;
}
