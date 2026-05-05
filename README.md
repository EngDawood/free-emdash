# Portfolio & Task Tracker

A modern, multilingual personal portfolio website and CMS built with [Astro](https://astro.build/) and [EmDash](https://github.com/emdash-cms/emdash), deployed on Cloudflare Workers. It features an integrated Model Context Protocol (MCP) server, allowing AI agents to interact directly with the CMS content.

## Features

- **Multilingual (i18n):** Native support for Arabic (default/RTL) and English (LTR) routing and content.
- **EmDash CMS Integration:** Content is managed via EmDash and fetched dynamically using the `emdashLoader`.
- **Model Context Protocol (MCP) Server:** A built-in MCP server (`/mcp` endpoint) running on Cloudflare Workers, exposing tools for AI agents to list, create, search, and manage CMS content.
- **Cloudflare Edge Infrastructure:** Deployed using Cloudflare Workers, leveraging Durable Objects, D1, and R2 for storage and database needs.
- **Responsive & Accessible Design:** Built with modern CSS (Vanilla CSS preferred), featuring smooth scroll-reveal animations and a polished UI.
- **Capabilities/Skills Section:** Dynamic display of technical proficiencies across languages, backend, infra, AI, and more.

## Tech Stack

- **Framework:** Astro
- **CMS:** EmDash (Cloudflare Variant)
- **Runtime:** Cloudflare Workers (Node.js compatibility layer)
- **Styling:** Vanilla CSS
- **Languages:** TypeScript, HTML, Astro
- **Integration:** Model Context Protocol (MCP) SDK

## 📚 Internal Codebase Documentation

For developers working on this project, comprehensive API and architectural documentation is available in the `docs/` directory:

- [Documentation Index](./docs/README.md)
  - [Components API](./docs/components.md)
  - [Routing & Pages Architecture](./docs/routing_and_pages.md)
  - [Utilities](./docs/utilities.md)
  - [Data & State](./docs/data.md)
  - [MCP & Worker Architecture](./docs/mcp_worker.md)
  - [MCP API Reference](./docs/mcp_api_reference.md)

## Getting Started

### Prerequisites

- Node.js 18+
- `pnpm` (install: `npm i -g pnpm`)
- Wrangler CLI

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd portfolio
pnpm install

# 2. Create .dev.vars (local environment)
cat > .dev.vars << EOF
EMDASH_TOKEN=your-dev-token-here
EMDASH_URL=http://localhost:4321
EOF

# 3. Initialize database (first time only)
pnpm bootstrap

# 4. Start dev server
pnpm dev
```

Server runs at `http://localhost:4321`

### Available Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm run deploy       # Deploy to Cloudflare
pnpm typecheck        # Run TypeScript check
pnpm test             # Run test suite
pnpm format           # Format code with oxfmt
pnpm bootstrap        # Initialize EmDash + seed content
```

## 📁 Project Structure

```
src/
├── components/          # Astro & React components
│   ├── tracker/        # Kanban board, drawer, table UI
│   ├── PostCard.astro  # Blog/project cards
│   └── ...
├── pages/              # File-based routing
│   ├── [locale]/       # Locale-specific routes
│   ├── api/            # API endpoints
│   └── tracker.astro   # Task tracker page
├── i18n/               # Translations (ar.json, en.json)
├── mcp/                # MCP server implementation
├── plugins/            # EmDash plugins
├── utils/              # Helper functions
├── live.config.ts      # EmDash collections schema
└── worker.ts           # Cloudflare Worker entry

docs/                   # API & architecture docs
migrations/             # Database migrations
seed/                   # Sample content
public/                 # Static assets
wrangler.jsonc          # Cloudflare config
```

## 🔧 Configuration

### Environment Variables (.dev.vars)

```env
EMDASH_TOKEN=<api-token>
EMDASH_URL=<base-url>       # Optional, defaults to deployed URL
```

### Collections (live.config.ts)

Define EmDash collections: Posts, Projects, Pages, Categories, Tags, etc. Schema is auto-synced with D1 on deploy.

## 📖 Documentation

- [Internal Architecture Docs](./docs/) — API reference, routing, MCP tools
- [EmDash Docs](./CLAUDE.EMDASH.md) — Collections, plugins, page structure
- [MCP Server](./CLAUDE-mcp.md) — Available tools for AI agents
- [Cloudflare Setup](./CLAUDE.CLOUDFLARE.md) — Workers, D1, R2 config

## 🤖 MCP Server

The `/mcp` endpoint provides AI-powered tools:

```bash
curl -H "Authorization: Bearer $EMDASH_TOKEN" http://localhost:4321/mcp
```

### Available Tools

- List/search collections
- Create/update/delete content
- Manage media & taxonomy
- Configure site settings

See [CLAUDE-mcp.md](./CLAUDE-mcp.md) for full tool reference.

## 📊 Task Tracker

Local-first task management with:
- Kanban board (drag-drop columns)
- Table view with filtering
- Settings panel
- Real-time database sync

Access at `/tracker` — persists to D1.

## 🌍 Internationalization

- Default locale: **Arabic** (RTL)
- Secondary: **English** (LTR)
- Translated strings in `src/i18n/{ar,en}.json`
- Route structure: `/` (ar), `/en/...` (en)

## 🚢 Deployment

```bash
# Test production build locally
pnpm build

# Deploy to Cloudflare
pnpm run deploy

# View live at https://your-worker-domain
```

## 📝 Development Guidelines

- **Format:** `pnpm format` (oxfmt, tabs for indentation)
- **Lint:** `pnpm lint:quick` after edits
- **Type check:** `pnpm typecheck` before commit
- **Changesets:** `pnpm changeset` for semver-tracked changes

See [AGENTS.md](./AGENTS.md) for architecture and contribution rules.

## 📚 See Also

- [Astro Docs](https://docs.astro.build)
- [EmDash Docs](https://github.com/emdash-cms/emdash)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Model Context Protocol](https://modelcontextprotocol.io/)