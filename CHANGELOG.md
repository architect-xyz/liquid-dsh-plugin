# Changelog

## 0.1.0

- Add the `liquid` model route through the stock `llm-pi-ai` adapter: `liquid.auto`, its ranking variants (`:cheapest`, `:economy`, `:balanced`, `:premium`) and a pinned `deepseek-v4-flash`.
- Send `low`, `medium` and `high` reasoning levels as `reasoning_effort`.
- Send a per-request cap in `x-liquid-cap-usd` (default 1 USD, `LIQUID_CAP_USD` to change it).
- Add four read-only tools: `liquid_get_book`, `liquid_get_markets`, `liquid_get_routers` and `liquid_get_job`.
- Read the buyer key from the credential store when mounted, else from `LIQUID_API_KEY`, so the tools activate in headless profiles.
- Add an install-and-boot test and CI.
