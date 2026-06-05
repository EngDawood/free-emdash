# Cloudflare Setup

## Skills

When working on Cloudflare-related tasks, load the relevant skill first:

- `cloudflare:wrangler` — Wrangler CLI commands, config fields, bindings, deployment
- `cloudflare:cloudflare` — General Cloudflare platform (Workers, D1, R2, KV, DO)
- `cloudflare:durable-objects` — Durable Objects (used for `EmDashMCP`)
- `cloudflare:workers-best-practices` — Workers code review and authoring
- `cloudflare:build-mcp` — MCP server on Cloudflare (relevant to `src/mcp/`)

## Account

**Plan: Free**

Free plan limits that affect this project:

| Feature | Free | Impact |
|---------|------|--------|
| `worker_loaders` (Worker Loader) | ❌ Not available | EmDash sandboxed plugins disabled in production |
| Durable Objects | ✅ Available | `EmDashMCP` works |
| D1 | ✅ Available | Content DB works |
| R2 | ✅ Available | Media storage works |
| KV | ✅ Available | Sessions work |

If upgraded to paid plan: add `worker_loaders` to `wrangler.prod.jsonc` to enable sandboxed plugins in production.

## Dual-Config Strategy

Two wrangler config files separate local dev from production deployment:

| File | Used by | Has `worker_loaders` |
|------|---------|----------------------|
| `wrangler.jsonc` | `pnpm dev` (astro dev / Miniflare) | ✅ Yes |
| `wrangler.prod.jsonc` | `pnpm run deploy` (wrangler deploy) | ❌ No |

The deploy script explicitly targets the prod config:
```json
"deploy": "astro build && wrangler deploy --config wrangler.prod.jsonc"
```

`wrangler.jsonc` is what `astro dev` reads via `@cloudflare/vite-plugin` (Miniflare). It has `worker_loaders` so the EmDash sandbox runner works locally. Miniflare emulates `worker_loaders` for free.

## Sandbox Plugin Behavior

EmDash uses `CloudflareSandboxRunner` (from `@emdash-cms/cloudflare/sandbox`) to run plugins in isolated V8 isolates via the `LOADER` binding (`worker_loaders`). The runner calls `isAvailable()` to check whether `LOADER` exists before attempting to load any plugin — if missing, sandboxed plugins are silently skipped (no error thrown).

| Env | `LOADER` binding | Sandboxed plugins (`astro.config` `sandboxed: []`) | Marketplace-installed plugins |
|-----|-----------------|-----------------------------------------------------|-------------------------------|
| `pnpm dev` (local) | ✅ Miniflare emulates it | Work | Work |
| `pnpm run deploy` (prod, free plan) | ❌ Not available | Silently disabled | Silently disabled |

`PluginBridge` is already exported from `src/worker.ts` (required by the runner alongside `LOADER`).

## Warning: Do NOT use `configPath` in `@astrojs/cloudflare`

Setting `configPath` in the Cloudflare adapter breaks EmDash's virtual module resolution:

```js
// ❌ BREAKS virtual:emdash/block-components and other emdash virtual modules
adapter: cloudflare({ configPath: "./wrangler.local.jsonc" })
```

When `configPath` is provided, `@cloudflare/vite-plugin` changes how it sets up Vite environments, causing the emdash Vite plugin's virtual modules to become unavailable in the Worker environment. The adapter must always be called with no arguments:

```js
// ✅ Correct
adapter: cloudflare()
```

## Account / API access

Account: **Engdawood**, accountId `c53938b50ea00b247dcd72dd2e9eada3`. The `cloudflare-api` MCP (`mcp__plugin_cloudflare_cloudflare-api__execute` / `search`) is authenticated with this account pre-set — use it for REST/GraphQL API queries (e.g. RUM analytics) without extra auth.

## R2 Buckets

| Bucket | Binding | Purpose |
|--------|---------|---------|
| `my-emdash-media` | `MEDIA` | EmDash media uploads (declared in wrangler configs) |
| `cdn-assets` | — | Static assets + Thmanyah fonts, served via custom domain `cdn.engdawood.com` |

### CDN fonts require CORS on `cdn-assets`

The Arabic typography (Thmanyah Serif Display / Serif Text / Sans) is loaded by `@font-face` in `src/layouts/Base.astro` from `https://cdn.engdawood.com/fonts/Thmanyah-Font-Family/...` (the `cdn-assets` bucket). Cross-origin `@font-face` requires CORS.

**Symptom of misconfiguration:** Arabic text silently falls back to a generic system serif (the CSS is fine — the browser rejects the font for a missing `Access-Control-Allow-Origin` header). `document.fonts.check('16px "Thmanyah Serif Display"')` returns `false`.

**Required `cdn-assets` CORS policy:**
```json
[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]
```

- **Use `*`, not a specific-origin list.** Cloudflare's edge cache ignores `Vary: Origin`, so an origin-list policy (R2 echoes the caller + `Vary: Origin`) gets cache-poisoned — one origin's cached response is served to all, re-breaking CORS. `*` is a single universally-valid cacheable response, and fonts are public assets anyway.
- **After changing CORS, purge the `engdawood.com` zone cache** (Caching → Purge Everything). Fonts are edge-cached up to 4h (`max-age=14400`) without the header, so the fix won't appear until stale copies are evicted.
- Verify: `curl -I -H "Origin: https://engdawood.com" <font-url>` must show `Access-Control-Allow-Origin: *`. Append `?cb=<rand>` to force a cache MISS (test origin) vs a cached HIT.

## Web Analytics (auto-injected — do NOT add a beacon)

Web Analytics is configured for `engdawood.com` via **automatic injection** (RUM = "Enable, excluding visitor data in the EU"). The beacon is injected by Cloudflare because the site is proxied (orange cloud).

**Do NOT add the `cloudflareinsights.com/beacon.min.js` snippet to `Base.astro`** — it would double-count every visit. The "exclude EU" option avoids needing a consent banner. Use Web Analytics (not Zaraz) for basic stats.

## Disabled add-ons — leave OFF

Neither applies to a Workers + R2 stack; both are paid and provide no benefit here:

- **Cache Reserve** — saves *origin egress*, but R2 egress is already free → pure added cost.
- **Load Balancing** — balances *multiple origin servers*, but Workers already run globally at the edge → nothing to balance.

Rule of thumb for dashboard upsells: anything about reducing origin egress or balancing origin servers does not apply. Zaraz "Custom HTML" is also unneeded — inject scripts directly in `Base.astro` (version-controlled) instead.
