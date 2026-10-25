// Einfacher localStorage-Ersatz für Node-Tests. Muss vor dem Import der App-Module gesetzt werden.
export class MemoryStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    if (this.full) throw new Error('QuotaExceededError');
    this.m.set(k, String(v));
  }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

globalThis.localStorage = new MemoryStorage();
