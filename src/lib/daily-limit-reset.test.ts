import { describe, expect, test as it } from 'bun:test';
import { canBuyDailyReset, DAILY_RESET_PRICE_CENTS } from './daily-limit-reset';

const now = Date.parse('2026-11-11T22:00:00Z');
const monthly = { status: 'active', token_limit: null, daily_token_limit: 600_000_000, expires_at: '2026-12-11T00:00:00Z' };

describe('reset de limite diário', () => {
  it('custa R$ 29,90', () => { expect(DAILY_RESET_PRICE_CENTS).toBe(2990); });
  it('disponível para plano mensal com limite diário', () => { expect(canBuyDailyReset(monthly, now)).toBe(true); });
  it('indisponível para pacote de tokens', () => { expect(canBuyDailyReset({ ...monthly, token_limit: 50_000_000, daily_token_limit: null }, now)).toBe(false); });
  it('indisponível para chave vencida ou bloqueada', () => {
    expect(canBuyDailyReset({ ...monthly, expires_at: '2026-11-01T00:00:00Z' }, now)).toBe(false);
    expect(canBuyDailyReset({ ...monthly, status: 'blocked' }, now)).toBe(false);
  });
});
