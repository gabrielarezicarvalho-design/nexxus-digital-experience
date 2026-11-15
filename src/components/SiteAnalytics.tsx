import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { ANALYTICS_CONSENT_KEY, analyticsAccepted, analyticsPath, deviceCategory } from '@/lib/site-analytics';

export function SiteAnalytics() {
  const path = useRouterState({ select: state => state.location.pathname });
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    recorded.current = null;
    const record = () => {
      if (!analyticsPath(path) || !analyticsAccepted(localStorage.getItem(ANALYTICS_CONSENT_KEY)) || recorded.current === path) return;
      recorded.current = path;
      void fetch('/api/public/site-view', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ id: crypto.randomUUID(), path, device: deviceCategory(navigator.userAgent, navigator.maxTouchPoints), consent: true }),
      }).catch(() => { recorded.current = null; });
    };
    record();
    window.addEventListener('nexa-analytics-consent', record);
    return () => window.removeEventListener('nexa-analytics-consent', record);
  }, [path]);
  return null;
}