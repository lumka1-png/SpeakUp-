import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ReportRequest } from './schemas';

export interface StoredReport extends ReportRequest { installId: string; receivedAt: string }

export interface ReportStore {
  add(r: StoredReport): Promise<void>;
  all(): Promise<StoredReport[]>;
}

/** Saves reports as JSON lines in a file. Fine for a beta; use a database later. */
export function fileReportStore(path: string): ReportStore {
  return {
    async add(r) {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, JSON.stringify(r) + '\n', 'utf8');
    },
    async all() {
      try {
        const text = await readFile(path, 'utf8');
        return text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as StoredReport);
      } catch {
        return [];
      }
    },
  };
}

export function memoryReportStore(): ReportStore {
  const items: StoredReport[] = [];
  return { add: async (r) => { items.push(r); }, all: async () => [...items] };
}

/** Simple per-install daily limits, kept in memory (resets when the server restarts). */
export class DailyLimiter {
  private counts = new Map<string, number>();
  private day = '';
  constructor(private limits: Record<string, number>) {}
  allow(installId: string, kind: string, now = new Date()): boolean {
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) { this.day = today; this.counts.clear(); }
    const key = `${kind}:${installId}`;
    const n = (this.counts.get(key) ?? 0) + 1;
    if (n > (this.limits[kind] ?? Infinity)) return false;
    this.counts.set(key, n);
    return true;
  }
}
