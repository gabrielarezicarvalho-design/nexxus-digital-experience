import { describe, expect, test as it } from 'bun:test';
import { canUpgradeTokens, isUpgradePackage } from './token-upgrade';

const key = { status: 'active', token_limit: 30_000_000, daily_token_limit: null, expires_at: null };
describe('upgrade na mesma chave de pacote', () => {
  it('permite pacote ativo e esgotado', () => {
    expect(canUpgradeTokens(key)).toBe(true);
    expect(canUpgradeTokens({ ...key, status: 'exhausted' })).toBe(true);
  });
  it('não permite recarga mensal 5x ou 20x', () => {
    for (const daily_token_limit of [250_000_000, 500_000_000]) {
      expect(canUpgradeTokens({ ...key, daily_token_limit })).toBe(false);
      expect(isUpgradePackage({ token_limit: null, daily_token_limit, duration_days: 30 })).toBe(false);
    }
  });
  it('não libera chaves bloqueadas, revogadas ou vencidas', () => {
    for (const status of ['blocked', 'revoked', 'expired']) expect(canUpgradeTokens({ ...key, status })).toBe(false);
    expect(canUpgradeTokens({ ...key, expires_at: '2026-01-01T00:00:00Z' }, Date.parse('2026-10-29T00:00:00Z'))).toBe(false);
  });
  it('vende apenas saldo total sem duração', () => {
    expect(isUpgradePackage({ token_limit: 100_000_000 })).toBe(true);
    expect(isUpgradePackage({ token_limit: 100_000_000, duration_days: 30 })).toBe(false);
  });
});