import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { pushGate, pushFailureAction } from './push-rules';
describe('push consent and delivery', () => {
  it('does not request permission without web configuration', () => assert.equal(pushGate(false, true, false), 'not-configured'));
  it('requires a top-level page', () => assert.equal(pushGate(true, true, true), 'open-in-new-tab'));
  it('does not register unsupported browsers', () => assert.equal(pushGate(true, false, false), 'unsupported'));
  it('permits supported configured standalone registration', () => assert.equal(pushGate(true, true, false), null));
  it('deletes unregistered devices rather than retrying', () => assert.equal(pushFailureAction(404, 'UNREGISTERED'), 'delete'));
  it('backs off on provider throttling', () => assert.equal(pushFailureAction(429, ''), 'retry'));
  it('does not retry forbidden credentials', () => assert.equal(pushFailureAction(403, ''), 'stop'));
});