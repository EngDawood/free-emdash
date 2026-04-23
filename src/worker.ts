import handler from "@astrojs/cloudflare/entrypoints/server";
import { EmDashMCP } from "./mcp";

interface WorkerEnv extends Cloudflare.Env {
	MCP_OBJECT: DurableObjectNamespace;
	EMDASH_TOKEN?: string;
	TRACKER_DB: D1Database;
	SESSION: KVNamespace;
	MEDIA: R2Bucket;
}

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";
export { EmDashMCP };

// ── Cookie helper ─────────────────────────────────────────────────────────────
function parseCookies(header: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const part of header.split(";")) {
		const idx = part.indexOf("=");
		if (idx < 0) continue;
		result[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
	}
	return result;
}

// ── Tracker API auth ──────────────────────────────────────────────────────────
async function isAuthenticated(request: Request, env: WorkerEnv): Promise<boolean> {
	const cookies = parseCookies(request.headers.get("Cookie") ?? "");
	const sessionId = cookies["astro-session"];
	if (!sessionId) return false;
	const session = await env.SESSION.get(sessionId);
	return session !== null;
}

// ── Tracker: query ────────────────────────────────────────────────────────────
async function handleTrackerQuery(request: Request, env: WorkerEnv): Promise<Response> {
	const { sql, params } = (await request.json()) as { sql: string; params?: unknown[] };
	const stmt = env.TRACKER_DB.prepare(sql);
	const result = params?.length ? await stmt.bind(...params).all() : await stmt.all();
	return new Response(JSON.stringify(result), {
		headers: { "Content-Type": "application/json" },
	});
}

// ── Tracker: upload ───────────────────────────────────────────────────────────
async function handleTrackerUpload(request: Request, env: WorkerEnv): Promise<Response> {
	const form = await request.formData();
	const file = form.get("file") as File;
	const taskId = form.get("taskId") as string;
	if (!file || !taskId) return new Response("Bad request", { status: 400 });

	const key = `tracker/${taskId}/${Date.now()}-${file.name}`;
	await env.MEDIA.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});
	return new Response(
		JSON.stringify({ url: `/api/tracker/file/${key}`, name: file.name, size: file.size }),
		{ headers: { "Content-Type": "application/json" } },
	);
}

// ── Tracker: serve file ───────────────────────────────────────────────────────
async function handleTrackerFile(url: URL, env: WorkerEnv): Promise<Response> {
	const key = url.pathname.replace("/api/tracker/file/", "");
	const obj = await env.MEDIA.get(key);
	if (!obj) return new Response("Not found", { status: 404 });
	return new Response(obj.body, {
		headers: {
			"Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
			"Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
		},
	});
}

export default {
	async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// ── MCP endpoint ──────────────────────────────────────────────────────
		if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
			// Auth only on GET (SSE handshake). POST /mcp/* are session-keyed by the DO.
			if (request.method !== "POST") {
				const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
				const queryToken = url.searchParams.get("token");
				const token = headerToken ?? queryToken;
				if (!env.EMDASH_TOKEN || token !== env.EMDASH_TOKEN) {
					return new Response("Unauthorized", { status: 401 });
				}
			}
			return EmDashMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// ── Tracker API — intercepted before Astro to avoid body consumption ──
		if (url.pathname.startsWith("/api/tracker")) {
			if (!(await isAuthenticated(request, env))) {
				return new Response("Unauthorized", { status: 401 });
			}
			if (url.pathname === "/api/tracker" && request.method === "POST") {
				return handleTrackerQuery(request, env);
			}
			if (url.pathname === "/api/tracker/upload" && request.method === "POST") {
				return handleTrackerUpload(request, env);
			}
			if (url.pathname.startsWith("/api/tracker/file/") && request.method === "GET") {
				return handleTrackerFile(url, env);
			}
			return new Response("Not found", { status: 404 });
		}

		return handler.fetch(request, env, ctx);
	},
};
