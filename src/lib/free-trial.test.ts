import { describe, expect, test as it } from "bun:test";
import { RESELLER_TRIAL_LIMIT, TRIAL_TOKENS, trialsRemaining } from "./free-trial";

describe("teste grátis", () => {
  it("dá 5 milhões de tokens", () => expect(TRIAL_TOKENS).toBe(5_000_000));
  it("revenda tem 20 testes", () => expect(RESELLER_TRIAL_LIMIT).toBe(20));
  it("após 20 testes não sobra nenhum", () => {
    expect(trialsRemaining(19)).toBe(1);
    expect(trialsRemaining(20)).toBe(0);
    expect(trialsRemaining(25)).toBe(0);
  });
});

import { canGenerateHourTrial, HOUR_TRIAL_MS, hourTrialLimits, TRIAL_PROVIDER } from "./free-trial";
import { keyProvider } from "./key-provider";
describe("teste de 30 minutos", () => {
  it("só para o Diego", () => {
    expect(canGenerateHourTrial("diegopiantkoski@gmail.com")).toBe(true);
    expect(canGenerateHourTrial("outro@gmail.com")).toBe(false);
  });
  it("dura 30 minutos", () => {
    expect(HOUR_TRIAL_MS).toBe(1_800_000);
    expect(hourTrialLimits(Date.parse("2026-11-08T02:00:00Z")).expires_at).toBe("2026-11-08T02:30:00.000Z");
  });
  it("não fica preso a nenhum fornecedor", () => {
    expect(TRIAL_PROVIDER).toBeNull();
    expect(keyProvider({ ...hourTrialLimits(0) })).toBeNull();
  });
  it("não tem limite total de tokens", () => expect(hourTrialLimits(0).token_limit).toBeNull());
  it("não tem limite diário de tokens", () => expect(hourTrialLimits(0).daily_token_limit).toBeNull());
});

import { canIssueResellerKeys } from "./free-trial";
describe("geração de chaves pela revenda", () => {
  it("só o Diego (revenda do teste de 30 minutos) pode gerar", () => {
    expect(canIssueResellerKeys("diegopiantkoski@gmail.com")).toBe(true);
    expect(canIssueResellerKeys("jbtoolss7@gmail.com")).toBe(false);
    expect(canIssueResellerKeys(null)).toBe(false);
  });
});
