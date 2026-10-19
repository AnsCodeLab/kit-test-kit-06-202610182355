export interface HealthRow {
  path: string;
  status: number | string;
  kind: string;
  ok: boolean;
  note: string;
  class?: string;
}
export function isLocal(base: string): boolean;
export function expectedHeaders(text: string): string[];
export function runHealthcheck(base: string, opts?: { headersFile?: string }): Promise<{ rows: HealthRow[]; failures: HealthRow[] }>;
export function formatTable(rows: HealthRow[]): string;
