const store = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string) {
    return store.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    store.set(key, value);
  },
  async removeItem(key: string) {
    store.delete(key);
  },
  async multiGet(keys: string[]) {
    return keys.map((key) => [key, store.get(key) ?? null] as [string, string | null]);
  },
  async multiSet(entries: Array<[string, string]>) {
    entries.forEach(([key, value]) => store.set(key, value));
  },
  async multiRemove(keys: string[]) {
    keys.forEach((key) => store.delete(key));
  },
  async clear() {
    store.clear();
  },
};

export default AsyncStorage;
