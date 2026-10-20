/**
 * Thin typed client for the Liquid Inference REST API. Market reads are public;
 * job receipts need a buyer key. Spec: GET {baseURL}/v1/openapi.json.
 */
export class LiquidApiError extends Error {
    status;
    path;
    constructor(status, path, detail) {
        super(`Liquid ${path} failed with ${status}: ${detail}`);
        this.status = status;
        this.path = path;
        this.name = 'LiquidApiError';
    }
}
export class MissingKeyError extends Error {
    constructor() {
        super('LIQUID_API_KEY is not set; a buyer key is required for this call');
        this.name = 'MissingKeyError';
    }
}
export class LiquidClient {
    options;
    base;
    doFetch;
    constructor(options) {
        this.options = options;
        this.base = options.baseURL.replace(/\/+$/, '').replace(/\/v1$/, '');
        this.doFetch = options.fetch ?? globalThis.fetch;
    }
    /** GET a public market view. */
    market(path, signal) {
        return this.get(path, false, signal);
    }
    /** GET an endpoint that needs the buyer key. */
    authed(path, signal) {
        return this.get(path, true, signal);
    }
    async get(path, auth, signal) {
        const headers = { accept: 'application/json' };
        if (auth) {
            const key = await this.options.getApiKey();
            if (!key)
                throw new MissingKeyError();
            headers.authorization = `Bearer ${key}`;
        }
        const res = await this.doFetch(`${this.base}${path}`, { headers, signal });
        if (!res.ok)
            throw new LiquidApiError(res.status, path, (await res.text()).slice(0, 500));
        return await res.json();
    }
}
