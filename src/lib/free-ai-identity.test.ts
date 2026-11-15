import { test, expect } from "bun:test";
import { rebrandText, withNexaIdentity, rebrandResponse, NEXA_IDENTITY_PROMPT } from "./free-ai-identity";

test("troca Free.ai e Free AI por Nexa Cloud", () => {
  expect(rebrandText("Sou o assistente do Free.ai e da Free AI")).toBe("Sou o assistente do Nexa Cloud e da Nexa Cloud");
});

test("injeta identidade Nexa Cloud só quando não há system", () => {
  const out = withNexaIdentity({ messages: [{ role: "user", content: "oi" }] }) as any;
  expect(out.messages[0]).toEqual({ role: "system", content: NEXA_IDENTITY_PROMPT });
  const keep = { messages: [{ role: "system", content: "x" }, { role: "user", content: "oi" }] };
  expect(withNexaIdentity(keep)).toBe(keep);
});

test("resposta reescrita", async () => {
  const r = rebrandResponse(new Response("data: Sou do Free.ai\n\n"));
  expect(await r.text()).toBe("data: Sou do Nexa Cloud\n\n");
});
