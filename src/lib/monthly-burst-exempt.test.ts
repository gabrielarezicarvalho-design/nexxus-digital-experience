import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { keyBurstLimit } from './monthly-burst';

describe('per-key window exemption', () => {
  it('Max key exempted has no window ceiling', () => {
    assert.equal(keyBurstLimit({ plano: 'Max', reseller_id: null, burst_exempt: true }), null);
  });
  it('Max key without exemption keeps 100M per hour', () => {
    assert.equal(keyBurstLimit({ plano: 'Max', reseller_id: null, burst_exempt: false }), 100_000_000);
  });
});
