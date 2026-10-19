import { describe, expect, it, vi } from 'vitest'
import { LiquidApiError, LiquidClient, MissingKeyError } from '../src/client.ts'
import { filterRows } from '../src/tools.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('LiquidClient', () => {
  it('reads public market views without credentials', async () => {
    const fetch = vi.fn(async () => json([{ market: 'm' }]))
    const client = new LiquidClient({ baseURL: 'https://x.test/v1/', getApiKey: async () => 'sk', fetch })
    expect(await client.market('/v1/exchange/markets')).toEqual([{ market: 'm' }])
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.test/v1/exchange/markets')
    expect((init.headers as Record<string, string>).authorization).toBeUndefined()
  })

  it('sends the bearer key on authed calls and resolves it per call', async () => {
    const fetch = vi.fn(async () => json({ job_id: 'j' }))
    const keys = ['sk-a', 'sk-b']
    const client = new LiquidClient({ baseURL: 'https://x.test', getApiKey: async () => keys.shift(), fetch })
    await client.authed('/v1/jobs/j')
    await client.authed('/v1/jobs/j')
    const auth = fetch.mock.calls.map(c => ((c as unknown as [string, RequestInit])[1].headers as Record<string, string>).authorization)
    expect(auth).toEqual(['Bearer sk-a', 'Bearer sk-b'])
  })

  it('fails before the network when the key is missing', async () => {
    const fetch = vi.fn()
    const client = new LiquidClient({ baseURL: 'https://x.test', getApiKey: async () => undefined, fetch })
    await expect(client.authed('/v1/jobs/j')).rejects.toBeInstanceOf(MissingKeyError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces HTTP failures with status and path', async () => {
    const fetch = vi.fn(async () => json({ error: 'nope' }, 404))
    const client = new LiquidClient({ baseURL: 'https://x.test', getApiKey: async () => 'sk', fetch })
    await expect(client.authed('/v1/jobs/zz')).rejects.toMatchObject({ status: 404, path: '/v1/jobs/zz' })
    await expect(client.authed('/v1/jobs/zz')).rejects.toBeInstanceOf(LiquidApiError)
  })
})

describe('filterRows', () => {
  const rows = [{ model: 'Claude-Sonnet' }, { model: 'deepseek-v4-flash' }, { model: 'deepseek-r1' }]

  it('matches case-insensitively and applies the limit', () => {
    expect(filterRows(rows, 'model', 'DEEPSEEK', 1)).toEqual([{ model: 'deepseek-v4-flash' }])
  })

  it('returns everything up to the default limit when no filter is given', () => {
    expect(filterRows(rows, 'model', undefined, undefined)).toHaveLength(3)
  })

  it('clamps limit into 1..200', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ model: `m${i}` }))
    expect(filterRows(many, 'model', undefined, 9999)).toHaveLength(200)
    expect(filterRows(many, 'model', undefined, 0)).toHaveLength(1)
  })
})
