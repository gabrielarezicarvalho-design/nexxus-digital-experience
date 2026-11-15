import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('newly approved existing key has no total or daily token limits and keeps its expiry', () => {
  const output = execFileSync('lovable', ['supabase', 'query', "SELECT count(*)::int AS verified_exception_count FROM public.api_keys WHERE id='c609818c-1572-4aa9-a44c-6450c28d3f8f' AND client_id='ed1139a3-3965-4bce-b22b-063001d57933' AND token_limit IS NULL AND daily_token_limit IS NULL AND status='active' AND expires_at='2026-11-30 05:49:41.577+00'::timestamptz"], { encoding: 'utf8' });
  assert.match(output, /"verified_exception_count"\s*:\s*1/);
});

test('approved existing key has neither token cap and retains its expiry', () => {
  const output = execFileSync('lovable', ['supabase', 'query', "SELECT count(*)::int AS verified_exception_count FROM public.api_keys WHERE id='fa503a0f-f792-4a32-b6b1-9575e0b4b131' AND client_id='02e7488b-bf78-4228-8e6c-4d16a9e0e70d' AND token_limit IS NULL AND daily_token_limit IS NULL AND status='active' AND expires_at='2026-11-29 23:40:07.613+00'::timestamptz"], { encoding: 'utf8' });
  assert.match(output, /"verified_exception_count"\s*:\s*1/);
});

test('sphynx approved key has no token limits while preserving status and expiry', () => {
  const output = execFileSync('lovable', ['supabase', 'query', "SELECT count(*)::int AS verified_exception_count FROM public.api_keys WHERE id='fc2ebe5c-1e28-4a04-8b4b-0630f570de28' AND client_id='0221a140-b7d4-4948-8659-51d0ef705067' AND token_limit IS NULL AND daily_token_limit IS NULL AND status='active' AND expires_at='2026-11-30 02:59:27.176+00'::timestamptz"], { encoding: 'utf8' });
  assert.match(output, /"verified_exception_count"\s*:\s*1/);
});