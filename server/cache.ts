export class LruCache<V> {
  #map = new Map<string, V>();
  constructor(private readonly max: number) {}

  get(key: string): V | undefined {
    const value = this.#map.get(key);
    if (value !== undefined) {
      this.#map.delete(key);
      this.#map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V) {
    this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.max) {
      const oldest = this.#map.keys().next().value;
      if (oldest !== undefined) this.#map.delete(oldest);
    }
  }
}

/** Fixed-window request counter per key. */
export class RateLimiter {
  #windows = new Map<string, { start: number; count: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns seconds until retry, or 0 when the request is allowed. */
  hit(key: string, now = Date.now()): number {
    const w = this.#windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      this.#windows.set(key, { start: now, count: 1 });
      if (this.#windows.size > 10_000) this.#prune(now);
      return 0;
    }
    if (w.count >= this.limit) return Math.ceil((w.start + this.windowMs - now) / 1000);
    w.count += 1;
    return 0;
  }

  #prune(now: number) {
    for (const [key, w] of this.#windows) {
      if (now - w.start >= this.windowMs) this.#windows.delete(key);
    }
  }
}
