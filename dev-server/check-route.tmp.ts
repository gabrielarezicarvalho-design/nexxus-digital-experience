import { fetchUpstream } from "@/lib/upstream.server";
const r = await fetchUpstream({ model: "claude", messages: [{ role: "user", content: "oi" }], max_tokens: 80 });
const text = await r.res.text();
console.log("provider:", r.provider, "| upstream model:", r.upstreamModel, "| status:", r.res.status);
console.log("resposta:", text.slice(0, 260));
