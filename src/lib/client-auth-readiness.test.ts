import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { watchClientIdentity } from './client-auth-readiness';

describe('client identity readiness', () => {
  it('publishes the initial session without waiting for a user network lookup', () => {
    let result: { id: string } | null | undefined;
    const stop = watchClientIdentity<{ id: string }>(publish => {
      publish({ id: 'signed-in-client' });
      return () => {};
    }, user => { result = user; }, () => assert.fail('unexpected timeout'));
    assert.deepEqual(result, { id: 'signed-in-client' });
    stop();
  });
  it('publishes signed-out and refreshed identities in event order', () => {
    let emit: (user: string | null) => void = () => {};
    const results: (string | null)[] = [];
    const stop = watchClientIdentity<string>(publish => { emit = publish; return () => {}; }, user => results.push(user), () => {});
    emit('initial'); emit('refreshed'); emit(null);
    assert.deepEqual(results, ['initial', 'refreshed', null]);
    stop();
    emit('stale');
    assert.deepEqual(results, ['initial', 'refreshed', null]);
  });
  it('exposes stalled initialization as recoverable without pretending the user signed out', async () => {
    let failed = false;
    let published = false;
    let emit: (user: string | null) => void = () => {};
    const stop = watchClientIdentity<string>(publish => { emit = publish; return () => {}; }, () => { published = true; }, () => { failed = true; }, 5);
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.equal(failed, true);
    assert.equal(published, false);
    emit('recovered');
    assert.equal(published, true);
    stop();
  });
  it('handles initialization exceptions and unsubscribes on cleanup', () => {
    let failures = 0;
    const stopFailed = watchClientIdentity(() => { throw new Error('storage unavailable'); }, () => {}, () => { failures++; });
    assert.equal(failures, 1);
    stopFailed();
    let unsubscribed = false;
    const stop = watchClientIdentity(() => () => { unsubscribed = true; }, () => {}, () => {});
    stop();
    assert.equal(unsubscribed, true);
  });
});