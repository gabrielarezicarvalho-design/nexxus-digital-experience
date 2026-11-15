import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { waitForPushWorker } from './push-worker';

class WorkerStub extends EventTarget {
  state = 'installing';
  activate(state: string) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
function registration(worker: WorkerStub) {
  return { installing: worker, waiting: null, active: null } as unknown as ServiceWorkerRegistration;
}
describe('messaging worker readiness', () => {
  it('waits for activation before permitting token registration', async () => {
    const worker = new WorkerStub();
    let ready = false;
    const pending = waitForPushWorker(registration(worker)).then(() => { ready = true; });
    await Promise.resolve();
    assert.equal(ready, false);
    worker.activate('installed');
    await Promise.resolve();
    assert.equal(ready, false);
    worker.activate('activated');
    await pending;
    assert.equal(ready, true);
  });
  it('rejects a failed worker rather than trying to subscribe', async () => {
    const worker = new WorkerStub();
    const pending = waitForPushWorker(registration(worker));
    worker.activate('redundant');
    await assert.rejects(pending, /push-worker-unavailable/);
  });
});