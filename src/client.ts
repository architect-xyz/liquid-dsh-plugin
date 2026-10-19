/**
 * Thin typed client for the Liquid Inference REST API. Market reads are public;
 * job receipts need a buyer key. Spec: GET {baseURL}/v1/openapi.json.
 */

export interface LiquidClientOptions {
  /** Exchange origin, without a trailing `/v1`. */
  baseURL: string
  /** Resolves the buyer key per call so rotated keys apply without a restart. */
  getApiKey: () => Promise<string | undefined>
  fetch?: typeof globalThis.fetch
}

export class LiquidApiError extends Error {
  constructor(readonly status: number, readonly path: string, detail: string) {
    super(`Liquid ${path} failed with ${status}: ${detail}`)
    this.name = 'LiquidApiError'
  }
}

export class MissingKeyError extends Error {
  constructor() {
    super('LIQUID_API_KEY is not set; a buyer key is required for this call')
    this.name = 'MissingKeyError'
  }
}

export class LiquidClient {
  private readonly base: string
  private readonly doFetch: typeof globalThis.fetch

  constructor(private readonly options: LiquidClientOptions) {
    this.base = options.baseURL.replace(/\/+$/, '').replace(/\/v1$/, '')
    this.doFetch = options.fetch ?? globalThis.fetch
  }

  /** GET a public market view. */
  market<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
    return this.get<T>(path, false, signal)
  }

  /** GET an endpoint that needs the buyer key. */
  authed<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
    return this.get<T>(path, true, signal)
  }

  private async get<T>(path: string, auth: boolean, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (auth) {
      const key = await this.options.getApiKey()
      if (!key) throw new MissingKeyError()
      headers.authorization = `Bearer ${key}`
    }
    const res = await this.doFetch(`${this.base}${path}`, { headers, signal })
    if (!res.ok) throw new LiquidApiError(res.status, path, (await res.text()).slice(0, 500))
    return await res.json() as T
  }
}
