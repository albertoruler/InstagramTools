export function throttle<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
  let lastRun = 0;
  let timeoutId: number | undefined;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastRun);

    if (remaining <= 0) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
      lastRun = now;
      fn(...args);
      return;
    }

    if (timeoutId === undefined) {
      timeoutId = window.setTimeout(() => {
        lastRun = Date.now();
        timeoutId = undefined;
        fn(...args);
      }, remaining);
    }
  }) as T;
}
