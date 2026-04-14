import handler from "@astrojs/cloudflare/entrypoints/server";
import { EmDashMCP } from "./mcp";

interface WorkerEnv extends Cloudflare.Env {
	MCP_OBJECT: DurableObjectNamespace;
	EMDASH_TOKEN?: string;
}

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";
export { EmDashMCP };

export default {
	fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
			const queryToken = url.searchParams.get("token");
			const token = headerToken ?? queryToken;
			if (!env.EMDASH_TOKEN || token !== env.EMDASH_TOKEN) {
				return new Response("Unauthorized", { status: 401 });
			}
			return EmDashMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return handler.fetch(request, env, ctx);
	},
};
