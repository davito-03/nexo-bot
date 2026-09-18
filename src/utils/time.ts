const UNIT_MS: Record<string, number> = {
  s: 1000,
  sec: 1000,
  secs: 1000,
  segundo: 1000,
  segundos: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minuto: 60_000,
  minutos: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hora: 3_600_000,
  horas: 3_600_000,
  d: 86_400_000,
  dia: 86_400_000,
  dias: 86_400_000,
  días: 86_400_000,
  w: 604_800_000,
  sem: 604_800_000,
  semana: 604_800_000,
  semanas: 604_800_000,
};

export function parseDuration(input: string): number | null {
  const re = /(\d+)\s*(s|sec|secs|segundo|segundos|m|min|mins|minuto|minutos|h|hr|hora|horas|d|dia|dias|días|w|sem|semana|semanas)/gi;
  let total = 0;
  let matched = false;
  for (const m of input.matchAll(re)) {
    matched = true;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const ms = UNIT_MS[unit];
    if (!ms) return null;
    total += n * ms;
  }
  return matched && total > 0 ? total : null;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  if (secs && parts.length < 2) parts.push(`${secs}s`);
  return parts.join(" ") || "0s";
}

export function timestamp(ms = Date.now(), style: "R" | "F" | "f" | "D" | "t" | "T" = "R"): string {
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function madridDay(ts = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export function madridYear(ts = Date.now()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric" }).format(new Date(ts)),
  );
}

/** Interpreta `YYYY-MM-DD HH:MM` como hora de Madrid. */
export function parseMadridDateTime(input: string): number | null {
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || min > 59) return null;
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "shortOffset" })
    .formatToParts(new Date(Date.UTC(y, mo - 1, d, 12)))
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const sign = tz.includes("-") ? -1 : 1;
  const hours = Number((tz.match(/(\d+)/) ?? ["1", "1"])[1]);
  return Date.UTC(y, mo - 1, d, h, min) - sign * hours * 3_600_000;
}
