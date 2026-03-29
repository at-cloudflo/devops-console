/**
 * Maps an array through an async function with bounded concurrency.
 * Drop-in replacement for Promise.all(items.map(fn)) that caps the number
 * of in-flight requests to avoid rate-limiting (e.g. ADO HTTP 429).
 */
export async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    worker
  );
  await Promise.all(workers);
  return results;
}
