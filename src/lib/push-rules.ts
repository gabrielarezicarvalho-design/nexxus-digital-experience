export type PushStatus = 'registered' | 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied';
export function pushGate(configured: boolean, supported: boolean, framed: boolean): Exclude<PushStatus, 'registered' | 'denied'> | null {
  if (!configured) return 'not-configured';
  if (!supported) return 'unsupported';
  if (framed) return 'open-in-new-tab';
  return null;
}
export function pushFailureAction(status: number, code: string): 'delete' | 'retry' | 'stop' {
  if ((status === 404 && code === 'UNREGISTERED') || (status === 400 && code === 'INVALID_ARGUMENT')) return 'delete';
  return status === 429 || status >= 500 ? 'retry' : 'stop';
}