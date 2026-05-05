# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start local dev server at http://localhost:4321
pnpm build        # Build for production (Astro + Cloudflare adapter)
pnpm run deploy   # Build then deploy to Cloudflare Workers via Wrangler (pnpm deploy is reserved)
pnpm typecheck    # Run astro check (TypeScript type validation)
pnpm bootstrap    # Initialize EmDash DB schema and seed content (first-time setup)
```

## Architecture Overview

This is an **Astro SSR site** deployed as a **Cloudflare Worker**, with **EmDash** as the CMS. All pages are server-rendered — there is no static output.

### Request Flow

```
Cloudflare Worker (src/worker.ts)
  ├── /mcp  → EmDashMCP Durable Object (src/mcp/index.ts)
  └── /*    → Astro SSR handler (@astrojs/cloudflare)
```

`src/worker.ts` is the Worker entry point. It intercepts `/mcp` requests (auth via `EMDASH_TOKEN` Bearer token), routing them to the `EmDashMCP` Durable Object. All other requests fall through to Astro's server handler.

### i18n Routing

Two locales: **`ar`** (default, RTL) and **`en`** (LTR). Default locale routes are served without a prefix (`/`), non-default locale routes are prefixed (`/en/...`).

- `src/i18n/utils.ts` — locale helpers: `t()`, `getDir()`, `localizedPath()`, `getLocaleFromPath()`
- `src/i18n/ar.json` / `en.json` — translation strings
- `src/pages/[locale]/` — locale-prefixed pages
- `src/pages/` root files — default locale (Arabic) pages

When adding translated UI strings, add keys to both JSON files.

### EmDash CMS Integration

Content lives in a Cloudflare D1 database, managed by EmDash. Collections are declared in `src/live.config.ts` via a single `_emdash` live collection. Pages use `getEmDashCollection()` and `getEmDashEntry()` from `emdash` to fetch content at request time.

Key EmDash bindings (declared in `wrangler.jsonc`):
- `DB` → D1 database (content storage)
- `MEDIA` → R2 bucket (media uploads)
- `SESSION` → KV namespace (auth sessions)
- `MCP_OBJECT` → Durable Object namespace (`EmDashMCP` class)

### MCP Server

`src/mcp/index.ts` exports `EmDashMCP`, a `McpAgent` (Cloudflare Agents SDK) backed by a Durable Object. It wraps `EmDashClient` and exposes tools for CRUD on collections, media, taxonomies, bylines, sections, and site settings. The server is reachable at `/mcp` on the deployed worker (also `wp.engdawood.com/mcp`).

### Plugins

`src/plugins/email-worker.ts` is a sandboxed Worker entrypoint registered as the `email:provide` capability via the `email-resend-provider` plugin in `astro.config.mjs`. Plugin sandboxing is handled by `@emdash-cms/cloudflare/sandbox` (`PluginBridge` exported from `worker.ts`).

### Base Layout

`src/layouts/Base.astro` is the root layout. It fetches site settings, primary menu, and pages from EmDash on every request. It uses EmDash UI primitives (`EmDashHead`, `EmDashBodyStart`, `EmDashBodyEnd`, `WidgetArea`) alongside custom components.

## Environment Variables

Local dev uses `.dev.vars` (not committed). Required vars:
- `EMDASH_TOKEN` — Bearer token for MCP endpoint auth
- `EMDASH_URL` — (optional) override base URL for EmDashClient (defaults to `https://engdawood.com`)


## EmDash CMS

See @CLAUDE.EMDASH.md for collections, plugins, patches, page structure, and common gotchas.

## MCP Server

See @CLAUDE-mcp.md for tool structure, runtime constraints, current tool inventory, and how to add new tools.

## Cloudflare / Wrangler

See @CLAUDE.CLOUDFLARE.md for the dual-config setup, sandbox plugin behavior, and known gotchas with the Cloudflare adapter.

## Patches

Two packages are patched via `pnpm patch`:
- `emdash@0.1.1` — `patches/emdash@0.1.1.patch`
- `@emdash-cms/auth@0.1.1` — `patches/@emdash-cms__auth@0.1.1.patch`

After `pnpm install`, patches are applied automatically. If you update these packages, re-apply or update the patches.
