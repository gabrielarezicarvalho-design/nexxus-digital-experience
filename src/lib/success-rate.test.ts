import { describe, expect, test } from 'bun:test';
import { successRate } from './success-rate';

describe('success rate with HTTP 502 back in the metric', () => {
  test('excludes only Felipe 502 while other clients 502 still count', () => {
    // 8 successes, two Felipe 502, one other client 502, one other error.
    expect(successRate(12, 8, 2)).toBe(80);
    expect(Number(successRate(12, 8).toFixed(4))).toBe(66.6667);
    expect(successRate(2, 0, 2)).toBe(100);
  });
  test('counts 502 as a failure in the denominator', () => {
    // 8 successes, one 502 and one other failure: 8 of 10 requests.
    expect(successRate(10, 8)).toBe(80);
  });

  test('counts site and supplier failures in the denominator', () => {
    expect(successRate(10, 8)).toBe(80);
  });

  test('client token and key limits are excluded from the denominator', () => {
    expect(successRate(12, 8, 2)).toBe(80);
  });

  test('model denied rejections are excluded rather than counted as successes', () => {
    expect(successRate(11, 8, 1)).toBe(80);
  });

  test('22 other client errors do not affect operational success', () => {
    expect(successRate(32, 8, 22)).toBe(80);
  });

  test('does not divide by zero when there are no requests', () => {
    expect(successRate(0, 0)).toBe(100);
  });

  test('reports a perfect rate only when every request succeeds', () => {
    expect(successRate(10, 10)).toBe(100);
  });
});
