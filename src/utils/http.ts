export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": "NexoBot/1.0", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "NexoBot/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
