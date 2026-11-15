export function waitForPushWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active?.state === 'activated') return Promise.resolve();
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) return Promise.reject(new Error('push-worker-unavailable'));
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', check);
    };
    const check = () => {
      if (worker.state === 'activated') { cleanup(); resolve(); }
      else if (worker.state === 'redundant') { cleanup(); reject(new Error('push-worker-unavailable')); }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('push-worker-timeout')); }, 20000);
    worker.addEventListener('statechange', check);
    check();
  });
}