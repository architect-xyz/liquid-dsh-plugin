import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, Config, inject } from '../src/index.ts'

function mount(credentials?: { resolve: () => Promise<{ value: string } | undefined> }) {
  const tools: Array<{ name: string, execute: (args: any, exec: any) => Promise<unknown> }> = []
  const ctx = {
    tools: { register: (t: any) => tools.push(t) },
    get: (service: string) => (service === 'credentials' ? credentials : undefined),
  }
  apply(ctx as any, Config({} as never))
  return tools
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('liquid-inference plugin', () => {
  it('requires only tools, so headless profiles without a credential store still activate', () => {
    expect(inject).toEqual(['tools'])
  })

  it('registers the four market tools', () => {
    expect(mount().map(t => t.name)).toEqual([
      'liquid_get_book',
      'liquid_get_markets',
      'liquid_get_routers',
      'liquid_get_job',
    ])
  })

  it('falls back to LIQUID_API_KEY when no credential store is mounted', async () => {
    vi.stubEnv('LIQUID_API_KEY', 'sk-env')
    const fetch = vi.fn(async () => new Response('{"job_id":"j"}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const job = mount().find(t => t.name === 'liquid_get_job')!
    await job.execute({ jobId: 'j' }, { signal: new AbortController().signal })
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-env')
  })

  it('prefers the credential store over the environment', async () => {
    vi.stubEnv('LIQUID_API_KEY', 'sk-env')
    const fetch = vi.fn(async () => new Response('{"job_id":"j"}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const job = mount({ resolve: async () => ({ value: 'sk-store' }) }).find(t => t.name === 'liquid_get_job')!
    await job.execute({ jobId: 'j' }, { signal: new AbortController().signal })
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-store')
  })

  it('fails the receipt tool before the network when no key is available', async () => {
    vi.stubEnv('LIQUID_API_KEY', '')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const job = mount().find(t => t.name === 'liquid_get_job')!
    await expect(job.execute({ jobId: 'j' }, { signal: new AbortController().signal })).rejects.toThrow(/LIQUID_API_KEY/)
    expect(fetch).not.toHaveBeenCalled()
  })
})
