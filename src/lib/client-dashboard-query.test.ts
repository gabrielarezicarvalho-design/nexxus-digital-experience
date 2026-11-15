import { expect, test } from 'bun:test';
import { CLIENT_DASHBOARD_QUERY_POLICY } from './client-dashboard-query';
test('failed dashboard reads do not multiply automatic retries', () => {
  expect(CLIENT_DASHBOARD_QUERY_POLICY.retry).toBe(false);
});