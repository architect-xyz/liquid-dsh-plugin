# dsh-liquid-inference

[Liquid Inference](https://liquidinference.ai) for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a `liquid` model route plus read-only market tools.

## Install

```sh
export LIQUID_API_KEY=sk-liquid-...   # buyer key with the `spend` scope
dsh plugin --profile web add dsh-liquid-inference
```

Pick **Liquid Auto** (`liquid.auto`) in the model picker.

## What it adds

**Model route `liquid`** — no adapter code. The bundle patch configures the stock `llm-pi-ai` adapter with `api: openai-completions`, `baseURL: https://router.inference.ai.exchange/v1` and `apiKeyEnv: LIQUID_API_KEY`.

- **Cap.** Each request carries `x-liquid-cap-usd`, the most it can cost, locked before the first token. The default is 1 USD; set `LIQUID_CAP_USD` in the launching environment to change it.
- **Models.** `liquid.auto` plus its ranking variants `:cheapest`, `:economy`, `:balanced` and `:premium` (documented in the description of `GET /v1/exchange/routers`), and `deepseek-v4-flash` as a pinned model. Add any id from `GET /v1/models` with a `models` entry in your profile's `cordis.patch.yml`.
- **Reasoning.** Levels `low`, `medium` and `high` are sent as `reasoning_effort`. The exchange passes the level through unchecked, so a level the winning provider rejects fails that request.

**Tools** (plugin `liquid-inference`)

| Tool | Endpoint | Key |
|---|---|---|
| `liquid_get_book` | `GET /v1/exchange/offers` | no |
| `liquid_get_markets` | `GET /v1/exchange/markets` | no |
| `liquid_get_routers` | `GET /v1/exchange/routers` | no |
| `liquid_get_job` | `GET /v1/jobs/{id}` | yes |

Chat, image, speech and video purchases are deliberately not tools: the harness's own model route is the one place that spends.

## Data flow

Full prompts and tool results go to `router.inference.ai.exchange`, which forwards them to whichever third-party provider wins the auction. The key is read per request, from the credential store when the profile mounts one and from `LIQUID_API_KEY` otherwise (headless profiles disable the store). It is never written to config.

## Notes

- The patch replaces the `llm-pi-ai` row's whole `config`. If another bundle also configures pi-ai providers, restate them in your profile's `cordis.patch.yml`.
- Develop: `pnpm install && pnpm run check`. `pnpm run test:install` packs the bundle, installs the tarball into an isolated profile of a real dsh (`DSH_VERSION` picks the release, default `next`) and boots it; it needs network access.
