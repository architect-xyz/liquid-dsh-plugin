import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LiquidClient } from './client.ts'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 200

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
type Row = Record<string, Json>

const rowsSchema = {
  type: 'array',
  items: { type: 'object', additionalProperties: true },
} as const

const objectSchema = { type: 'object', additionalProperties: true } as const

const asText = (value: Json) => [{ type: 'text' as const, text: JSON.stringify(value) }]

/** Case-insensitive substring match against one field. */
export function filterRows(rows: Row[], field: string, needle: string | undefined, limit: number | undefined): Row[] {
  const n = needle?.trim().toLowerCase()
  const hits = n ? rows.filter(r => String(r[field] ?? '').toLowerCase().includes(n)) : rows
  return hits.slice(0, Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT))
}

export function createTools(client: LiquidClient) {
  return [
    defineTool({
      name: 'liquid_get_book',
      description:
        'List resting offers on the Liquid Inference exchange (anonymised, cheapest generation rate first): '
        + 'model, kind, region, per-Mtok rates, latency commitments. Free; no key needed.',
      parameters: {
        model: { type: 'string', description: 'Keep offers whose model id contains this text' },
        limit: { type: 'number', description: `Most offers to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})` },
      },
      output: { schema: rowsSchema, render: (_a, v) => asText(v) },
      async execute(args, exec) {
        const rows = await client.market<Row[]>('/v1/exchange/offers', exec.signal)
        return filterRows(rows, 'model', args.model, args.limit)
      },
    }),
    defineTool({
      name: 'liquid_get_markets',
      description: 'Market depth per served model: independent providers and offer rows. Free; no key needed.',
      parameters: {
        model: { type: 'string', description: 'Keep markets whose name contains this text' },
        limit: { type: 'number', description: `Most markets to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})` },
      },
      output: { schema: rowsSchema, render: (_a, v) => asText(v) },
      async execute(args, exec) {
        const rows = await client.market<Row[]>('/v1/exchange/markets', exec.signal)
        return filterRows(rows, 'market', args.model, args.limit)
      },
    }),
    defineTool({
      name: 'liquid_get_routers',
      description:
        'List router models (such as liquid.auto) with their ranking rules and the models they may pick. '
        + 'Use a router name as the model id. Free; no key needed.',
      parameters: {},
      output: { schema: rowsSchema, render: (_a, v) => asText(v) },
      async execute(_args, exec) {
        return await client.market<Row[]>('/v1/exchange/routers', exec.signal)
      },
    }),
    defineTool({
      name: 'liquid_get_job',
      description:
        'Receipt for one settled job: cap, estimated and total charge in USD, tokens metered, timing, routing. '
        + 'Needs LIQUID_API_KEY. A job of another workspace reads as not found.',
      parameters: {
        jobId: { type: 'string', required: true, description: 'Job id from the x-liquid-job-id header or exchange.job_id' },
      },
      output: { schema: objectSchema, render: (_a, v) => asText(v) },
      async execute(args, exec) {
        return await client.authed<Row>(`/v1/jobs/${encodeURIComponent(args.jobId)}`, exec.signal)
      },
    }),
  ]
}
