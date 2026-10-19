export interface Release {
  name: string;
  version: string;
  commit: string;
  sourceDateEpoch: number;
  builtAt: string;
  contentChecksum: string | null;
  fileCount: number;
}
export function listFiles(dir: string): string[];
export function checksumLines(dir: string): string;
export function sourceDateEpoch(env: Record<string, string | undefined>, cwd: string): string;
export function runRelease(opts?: { cwd?: string; env?: NodeJS.ProcessEnv; skipInstall?: boolean; log?: (msg: string) => void }): Release;
