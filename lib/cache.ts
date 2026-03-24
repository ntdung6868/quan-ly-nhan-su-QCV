// Simple in-memory cache for client-side data
// Data persists across page navigations within same session

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = Infinity; // Cache sống trong toàn bộ session, invalidate thủ công khi CRUD

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
