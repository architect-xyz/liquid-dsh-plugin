# dsh-liquid-inference

[Liquid Inference](https://liquidinference.ai) for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a `liquid` model route plus read-only market tools.

## Install

```sh
export LIQUID_API_KEY=sk-liquid-...   # buyer key with the `spend` scope
dsh plugin --profile web add dsh-liquid-inference
```

Pick **Liquid Auto** (`liquid.auto`) in the model picker.

## What it adds

**Model route `liquid`** — no adapter code. The bundle patch configures the stock `llm-pi-ai` adapter with `api: openai-completions`, `baseURL: https://router.inference.ai.exchange/v1`, `apiKeyEnv: LIQUID_API_KEY` and `x-liquid-cap-usd: '1'`, so no request can cost more than 1 USD. Edit the cap in your profile's `cordis.patch.yml`.

**Tools** (plugin `liquid-inference`)

| Tool | Endpoint | Key |
|---|---|---|
| `liquid_get_book` | `GET /v1/exchange/offers` | no |
| `liquid_get_markets` | `GET /v1/exchange/markets` | no |
| `liquid_get_routers` | `GET /v1/exchange/routers` | no |
| `liquid_get_job` | `GET /v1/jobs/{id}` | yes |

Chat, image, speech and video purchases are deliberately not tools: the harness's own model route is the one place that spends.

## Data flow

Full prompts and tool results go to `router.inference.ai.exchange`, which forwards them to whichever third-party provider wins the auction. The key is read per request from the credential store and never written to config.

## Notes

- The patch replaces the `llm-pi-ai` row's whole `config`. If another bundle also configures pi-ai providers, restate them in your profile's `cordis.patch.yml`.
- Develop: `pnpm install && pnpm test && pnpm run typecheck`. Try it with `DSH_HOME=$(mktemp -d) dsh plugin --profile dev add $PWD`.
