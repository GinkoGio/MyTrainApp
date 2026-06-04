// Mock minimale di localStorage per i test in ambiente Node, così gli store
// Zustand con `persist` possono idratarsi/scrivere senza un DOM completo.
class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
}

const storage = new LocalStorageMock();
globalThis.localStorage = storage;
// zustand-persist verifica la presenza di `window` prima di usare localStorage;
// in ambiente Node lo forniamo minimale per evitare warning rumorosi nei test.
if (typeof globalThis.window === 'undefined') {
  (globalThis as { window?: unknown }).window = { localStorage: storage };
}
