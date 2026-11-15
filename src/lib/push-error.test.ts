import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { pushErrorMessage } from './push-error';

describe('safe push diagnostics', () => {
  it('removes bearer credentials from diagnostics', () => {
    const result = pushErrorMessage(new Error('Authorization: Bearer private-value'), 'activation');
    assert.equal(result.includes('private-value'), false);
  });
  it('removes URLs that may contain registration credentials', () => {
    const result = pushErrorMessage(new Error('Failed https://example.test/?token=private-value'), 'registration');
    assert.equal(result.includes('private-value'), false);
    assert.equal(result.includes('example.test'), false);
  });
  it('removes long device registration identifiers', () => {
    const result = pushErrorMessage(new Error(`Failed ${'x'.repeat(120)}`), 'activation');
    assert.equal(result.includes('x'.repeat(120)), false);
  });
});