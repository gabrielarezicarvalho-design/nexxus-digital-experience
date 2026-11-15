import { expect, test } from "bun:test";
import { INVISION_MODEL_ALIASES, versionedClaudeHops } from "./upstream.server";

// A Invision atende os modelos públicos da Ghost por trás destes nomes internos.
test("Claude Opus 5.5 usa openai/gpt-6-luna-invision na Invision", () => {
  expect(INVISION_MODEL_ALIASES["claude-opus-5-5"]).toBe("openai/gpt-6-luna-invision");
});

test("Claude Sonnet 5 usa anthropic/claude-haiku-5.5 na Invision", () => {
  expect(INVISION_MODEL_ALIASES["claude-sonnet-5"]).toBe("anthropic/claude-haiku-5.5");
});

test("Claude Fable 5.1 usa deepseek/deepseek-v4-flash na Invision", () => {
  expect(INVISION_MODEL_ALIASES["claude-fable-5.1"]).toBe("deepseek/deepseek-v4-flash");
});

test("Somente os três modelos públicos têm nome interno na Invision", () => {
  expect(Object.keys(INVISION_MODEL_ALIASES).sort()).toEqual([
    "claude-fable-5.1",
    "claude-opus-5-5",
    "claude-sonnet-5",
  ]);
});

test("A prioridade salva define quem atende primeiro: Invision usa seu nome interno", () => {
  const anthropic = { name: 'Anthropic Revenda', base_url: 'https://primary.test/v1', api_secret_name: 'TEST_PRIMARY', available_models: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5'] };
  const invision = { name: 'Invision', base_url: 'https://secondary.test/v1', api_secret_name: 'TEST_SECONDARY', available_models: Object.values(INVISION_MODEL_ALIASES) };
  for (const [publicModel, primaryModel, secondaryModel] of [
    ['claude-opus-5-5', 'claude-opus-5', 'openai/gpt-6-luna-invision'],
    ['claude-sonnet-5', 'claude-sonnet-5', 'anthropic/claude-haiku-5.5'],
    ['claude-fable-5.1', 'claude-fable-5', 'deepseek/deepseek-v4-flash'],
  ] as const) {
    expect(versionedClaudeHops(anthropic, [invision, anthropic], publicModel, primaryModel).map(hop => [hop.account.name, hop.upstreamModel])).toEqual([
      ['Invision', secondaryModel], ['Anthropic Revenda', primaryModel],
    ]);
  }
});

test("Reservas entram na ordem salva, cada uma com o nome que entende", () => {
  const anthropic = { name: 'Anthropic Revenda', base_url: 'https://primary.test/v1', api_secret_name: 'TEST_PRIMARY', available_models: ['claude-opus-5'] };
  const invision = { name: 'Invision', base_url: 'https://invision.test/v1', api_secret_name: 'TEST_INVISION', available_models: [INVISION_MODEL_ALIASES['claude-opus-5-5'] as string] };
  const reserva = { name: 'Reserva Teste', base_url: 'https://reserva.test/v1', api_secret_name: 'TEST_RESERVA', available_models: ['claude-opus-5.5'] };
  const lauren = { name: 'Lauren API', base_url: 'https://lauren.test/v1', api_secret_name: 'TEST_LAUREN', available_models: ['claude-opus-5'] };
  const hops = versionedClaudeHops(anthropic, [invision, anthropic, reserva, lauren], 'claude-opus-5-5', 'claude-opus-5');
  expect(hops.map(hop => [hop.account.name, hop.upstreamModel])).toEqual([
    ['Invision', 'openai/gpt-6-luna-invision'],
    ['Anthropic Revenda', 'claude-opus-5'],
    ['Reserva Teste', 'claude-opus-5.5'],
  ]);
});
