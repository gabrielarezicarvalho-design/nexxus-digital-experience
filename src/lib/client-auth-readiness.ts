export function watchClientIdentity<T>(
  subscribe: (publish: (user: T | null) => void) => () => void,
  publish: (user: T | null) => void,
  unavailable: () => void,
  timeoutMs = 12_000,
) {
  let active = true;
  const timeout = setTimeout(() => { if (active) unavailable(); }, timeoutMs);
  let unsubscribe = () => {};
  try {
    unsubscribe = subscribe(user => {
      if (!active) return;
      clearTimeout(timeout);
      publish(user);
    });
  } catch {
    clearTimeout(timeout);
    unavailable();
  }
  return () => {
    active = false;
    clearTimeout(timeout);
    unsubscribe();
  };
}