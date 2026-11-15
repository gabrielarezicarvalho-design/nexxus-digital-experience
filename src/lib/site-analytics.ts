export const ANALYTICS_CONSENT_KEY = 'nexa-analytics-consent';
export function setAnalyticsConsent(accepted: boolean) {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, accepted ? 'accepted' : 'essential');
  window.dispatchEvent(new Event('nexa-analytics-consent'));
}
export function analyticsAccepted(value: string | null) { return value === 'accepted'; }
export function deviceCategory(userAgent: string, touchPoints = 0): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return 'tablet';
  return /Mobile|iPhone|iPod|Android/i.test(userAgent) ? 'mobile' : 'desktop';
}
export function analyticsPath(path: string) {
  // Private pages, API requests and dynamic identifiers are not counted.
  return ['/', '/entrar', '/docs', '/status', '/termos', '/reembolso', '/consumo'].includes(path);
}
export function countryCode(value: unknown) {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) && !['XX', 'T1'].includes(value) ? value : 'Unknown';
}