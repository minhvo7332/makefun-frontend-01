// make.fun's public API, read-only: one GET helper with ETag revalidation and a
// small in-memory cache, plus a live counter of what the network actually did.
// The API sends ETags bound to the minute, so a revalidation inside the same
// minute answers 304 and costs nothing but the request line.

const API = 'https://make.fun/api';
const cache = new Map();
const inflight = new Map();
export const stats = { requests: 0, cached: 0, bytes: 0 };

const listeners = new Set();
export function onStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(stats);
}

export async function get(path) {
  const hit = cache.get(path);
  if (inflight.has(path)) return inflight.get(path);
  const p = (async () => {
    const headers = hit?.etag ? { 'If-None-Match': hit.etag } : {};
    const res = await fetch(API + path, { headers });
    stats.requests++;
    if (res.status === 304 && hit) {
      stats.cached++;
      emit();
      return hit.body;
    }
    const text = await res.text();
    stats.bytes += text.length;
    const body = JSON.parse(text);
    const etag = res.headers.get('ETag');
    if (etag) cache.set(path, { etag, body });
    emit();
    return body;
  })();
  inflight.set(path, p);
  try {
    return await p;
  } finally {
    inflight.delete(path);
  }
}

export async function getPages(path) {
  const items = [];
  let url = path;
  for (;;) {
    const page = await get(url);
    items.push(...(page.items ?? []));
    if (!page.next_cursor) return items;
    const sep = url.includes('?') ? '&' : '?';
    url = `${path}${sep}cursor=${encodeURIComponent(page.next_cursor)}`;
  }
}

export function bust(path) {
  cache.delete(path);
}

/** An API-relative image path (avatars) as an absolute make.fun URL. */
export function apiImage(path) {
  return path ? API.replace('/api', '') + path : '';
}
