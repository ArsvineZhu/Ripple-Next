/** Material resources bounded by entry count and estimated resident bytes. */
export class MapCache<T> {
  private entries = new Map<string, { value: T; bytes: number }>();
  private bytes = 0;
  constructor(
    private limit = 96,
    private budget = 48 * 1024 * 1024,
  ) {}
  get(key: string) {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit.value;
  }
  set(key: string, value: T, bytes: number) {
    const old = this.entries.get(key);
    if (old) {
      this.bytes -= old.bytes;
      this.entries.delete(key);
    }
    if (bytes > this.budget) return;
    this.entries.set(key, { value, bytes });
    this.bytes += bytes;
    while (this.entries.size > this.limit || this.bytes > this.budget) {
      const first = this.entries.keys().next().value!;
      this.bytes -= this.entries.get(first)!.bytes;
      this.entries.delete(first);
    }
  }
  clear() {
    this.entries.clear();
    this.bytes = 0;
  }
  snapshot() {
    return {
      entries: this.entries.size,
      estimatedBytes: this.bytes,
      maxEntries: this.limit,
      maxBytes: this.budget,
    };
  }
}
