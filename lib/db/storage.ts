import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageError extends Error {
  constructor(message = "Ma'lumotni saqlab bo'lmadi") {
    super(message);
    this.name = 'StorageError';
  }
}

export class CorruptDataError extends Error {
  key: string;
  constructor(key: string) {
    super(`Ma'lumot buzilgan: ${key}`);
    this.name = 'CorruptDataError';
    this.key = key;
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Barcha yozuvlar bitta umumiy navbat orqali ketma-ket bajariladi.
let chain: Promise<unknown> = Promise.resolve();
export function enqueue<R>(task: () => Promise<R>): Promise<R> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

export const colKey = (name: string) => `col:${name}`;

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new CorruptDataError(key);
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StorageError();
  }
}

export type Collection<T extends { id: string }> = {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  replaceAll(items: T[]): Promise<void>;
};

export function createCollection<T extends { id: string }>(name: string): Collection<T> {
  const key = colKey(name);
  const read = async (): Promise<T[]> => {
    const v = await readJson<unknown>(key);
    if (v === null) return [];
    if (!Array.isArray(v)) throw new CorruptDataError(key);
    return v as T[];
  };
  return {
    list: read,
    async get(id) {
      return (await read()).find((x) => x.id === id) ?? null;
    },
    insert: (item) =>
      enqueue(async () => {
        const all = await read();
        const created = { ...item, id: newId() } as T;
        await writeJson(key, [...all, created]);
        return created;
      }),
    update: (id, patch) =>
      enqueue(async () => {
        const all = await read();
        const i = all.findIndex((x) => x.id === id);
        if (i < 0) throw new StorageError('Yozuv topilmadi');
        const next = { ...all[i], ...patch, id } as T;
        const copy = all.slice();
        copy[i] = next;
        await writeJson(key, copy);
        return next;
      }),
    remove: (id) =>
      enqueue(async () => {
        const all = await read();
        await writeJson(key, all.filter((x) => x.id !== id));
      }),
    replaceAll: (items) => enqueue(() => writeJson(key, items)),
  };
}
