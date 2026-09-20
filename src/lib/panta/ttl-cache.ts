type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, CacheEntry<T>>();
  const pending = new Map<string, Promise<T>>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now()) {
        return Promise.resolve(cached.value);
      }

      const inFlight = pending.get(key);
      if (inFlight) return inFlight;

      const request = load()
        .then((value) => {
          entries.set(key, { value, expiresAt: now() + ttlMs });
          return value;
        })
        .finally(() => pending.delete(key));

      pending.set(key, request);
      return request;
    },
  };
}
