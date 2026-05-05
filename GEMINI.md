# Project Overview

This is a modern, multilingual (Arabic and English) personal portfolio and content management system built with **Astro** and **EmDash CMS**. It is explicitly designed for edge deployment on **Cloudflare Workers**. 

A unique feature of this project is its integrated **Model Context Protocol (MCP) Server**, which runs natively on Cloudflare (using Durable Objects) to expose CMS capabilities to AI agents over HTTP Server-Sent Events (SSE).

## Core Technologies
- **Framework:** [Astro](https://astro.build/) (SSR mode, using the `@astrojs/cloudflare` adapter)
- **CMS:** [EmDash](https://github.com/emdash-cms/emdash) (Cloudflare variant)
- **Package Manager:** pnpm
- **Cloudflare Infrastructure:**
  - **D1 Database:** Used as the primary CMS data store (`my-emdash-site`).
  - **R2 Storage:** Used for media and file uploads (`my-emdash-media`).
  - **KV Namespaces:** Used for session management.
  - **Durable Objects:** Hosts the `EmDashMCP` server state.
- **Language:** TypeScript
- **Styling:** Vanilla CSS (TailwindCSS is intentionally avoided per conventions).

## Building and Running

The project relies on `pnpm` for package management and `wrangler` for local Cloudflare emulation and deployment.

### Installation & Initialization
```bash
# Install dependencies
pnpm install

# Initialize EmDash database and seed initial content
pnpm bootstrap
```

### Local Development
```bash
# Start the Astro development server (with Cloudflare Miniflare bindings)
pnpm dev
```
- The frontend and CMS admin panel run locally at `http://localhost:4321`.
- The MCP server runs at `http://localhost:4321/mcp` (requires an `Authorization: Bearer <TOKEN>` header).

### Building and Deployment
```bash
# Build the Astro site and EmDash CMS for production
pnpm build

# Deploy to Cloudflare Workers (requires Wrangler authentication)
pnpm deploy
```

### Type Checking
```bash
pnpm typecheck
```

## Development Conventions & Architecture

1. **Routing & i18n:**
   - Astro file-based routing is used, heavily relying on the `[locale]` dynamic parameter.
   - The default locale is Arabic (`ar`), and the application is RTL-first.
   - Translations and locale utilities are located in `src/i18n/`.
   - The root `src/pages/index.astro` performs an immediate 302 redirect to `/${defaultLocale}/`.

2. **Data Fetching:**
   - The frontend fetches CMS content dynamically using `getEmDashCollection` and `getSiteSettings` provided by the EmDash SDK.
   - The schema and CMS setup are bootstrapped using `npx emdash init`.

3. **Cloudflare Worker & MCP:**
   - The standard Astro server entry point is overridden by `src/worker.ts`.
   - `src/worker.ts` intercepts `/mcp` requests, verifies an authorization token (`EMDASH_TOKEN`), and routes valid requests to the `EmDashMCP` Durable Object.
   - The MCP server implementation is located in `src/mcp/index.ts`.

4. **Styling & Components:**
   - Vanilla CSS is used exclusively within Astro component `<style>` blocks.
   - Reusable Astro components are located in `src/components/`.

5. **Internal Documentation:**
   - Deep technical API and structural documentation is maintained in the `docs/` folder. Always refer to `docs/README.md` when questions arise about components, routing, or the MCP architecture.
