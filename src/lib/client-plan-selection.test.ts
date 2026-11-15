import { describe, expect, test } from 'bun:test';
import { showFirstPlanCatalog } from './client-plan-selection';

describe('first subscription catalog', () => {
  test('customers without a plan see the site catalog', () => {
    expect(showFirstPlanCatalog([])).toBe(true);
  });
  test('issuing the purchased key switches to the existing plan screen', () => {
    expect(showFirstPlanCatalog([{ id: 'purchased-key' }])).toBe(false);
  });
});