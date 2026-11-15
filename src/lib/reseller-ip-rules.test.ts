import { test } from "node:test";
import assert from "node:assert/strict";
import { isResellerIpAllowed, normalizeIp, resellerIpsInput, resellerRequestIp } from "./reseller-ip-rules";

test("sem IPs aprovados, a geração é recusada", () => {
  assert.equal(isResellerIpAllowed("203.0.113.10", []), false);
});
test("somente o IP autorizado pode usar a chave de geração", () => {
  assert.equal(isResellerIpAllowed("203.0.113.10", ["203.0.113.10"]), true);
  assert.equal(isResellerIpAllowed("203.0.113.11", ["203.0.113.10"]), false);
});
test("IP desconhecido é recusado mesmo com lista configurada", () => {
  assert.equal(isResellerIpAllowed(null, ["203.0.113.10"]), false);
});
test("normaliza IPv6 e IPv4 mapeado sem alargar a permissão", () => {
  assert.equal(isResellerIpAllowed("2001:db8::1", ["2001:0db8:0:0:0:0:0:1"]), true);
  assert.equal(isResellerIpAllowed("::ffff:203.0.113.10", ["203.0.113.10"]), true);
  assert.equal(normalizeIp("203.0.113.0/24"), null);
});
test("não aceita X-Forwarded-For para autorizar o acesso", () => {
  const spoof = new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.10" } });
  assert.equal(resellerRequestIp(spoof), null);
  const trusted = new Request("https://example.test", { headers: { "cf-connecting-ip": "203.0.113.11", "x-forwarded-for": "203.0.113.10" } });
  assert.equal(resellerRequestIp(trusted), "203.0.113.11");
});
test("lista administrativa rejeita IP inválido e elimina duplicados", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(resellerIpsInput.safeParse({ id, ips: ["qualquer coisa"] }).success, false);
  assert.deepEqual(resellerIpsInput.parse({ id, ips: ["203.0.113.10", "203.0.113.10"] }).ips, ["203.0.113.10"]);
});