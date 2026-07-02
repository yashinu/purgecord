export class Checkpoint {
  constructor(storage, key = 'purgecord:state') {
    this.storage = storage;
    this.key = key;
  }
  save(state) {
    try { this.storage.setItem(this.key, JSON.stringify(state)); } catch { /* quota/access */ }
  }
  load() {
    try {
      const s = this.storage.getItem(this.key);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  clear() {
    try { this.storage.removeItem(this.key); } catch { /* yoksay */ }
  }
}
