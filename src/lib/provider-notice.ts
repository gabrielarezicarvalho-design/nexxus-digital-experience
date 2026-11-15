export const providerNoticeQueryKey = ["provider-notice"] as const;

export function isProviderNoticeEnabled(setting: { enabled: boolean } | null | undefined) {
  return setting?.enabled === true;
}