// A request the client cancelled (Ctrl+C / Esc in a terminal, closing the app) is not a site or supplier
// failure: it is logged as 499 so it stays out of the success rate and never cools down a supplier model.
// Gabriel, 15/11/2026.
export const CLIENT_CANCELLED_STATUS = 499;
export const CLIENT_CANCELLED_ERROR = "Cancelado pelo cliente";

export function clientCancelled(request: Request, status: number): boolean {
  return status >= 500 && request.signal.aborted;
}

/** Status and log fields to record, turning a failure caused by the client's own cancel into a 499. */
export function cancelAware(request: Request, status: number, extra: Record<string, unknown> = {}): [number, Record<string, unknown>] {
  if (!clientCancelled(request, status)) return [status, extra];
  return [CLIENT_CANCELLED_STATUS, { ...extra, error: CLIENT_CANCELLED_ERROR }];
}
