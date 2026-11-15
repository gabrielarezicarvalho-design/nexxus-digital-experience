// A failed dashboard read must reach the retry control instead of remaining pending.
export const CLIENT_DASHBOARD_QUERY_POLICY = { retry: false } as const;