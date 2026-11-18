// Short waits that keep a busy look on screen (context/details/1060, 1090): on a fast network
// "Checking…" and "Preparing…" would otherwise flash by.

/**
 * Settle with `promise`'s own result (value or rejection), but never before `ms` has passed.
 * A promise slower than `ms` isn't held any longer. With no time to wait, it is `promise` itself.
 */
export function atLeast<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;
  const elapsed = new Promise<void>((resolve) => setTimeout(resolve, ms));
  // allSettled, so a fast rejection still waits for the time to pass before it is passed on.
  return Promise.allSettled([promise, elapsed]).then(([result]) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}
