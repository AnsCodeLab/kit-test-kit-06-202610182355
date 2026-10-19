export const REQUIRED: string[];
export function missingVars(env: Record<string, string | undefined>): string[];
export function redact(text: string, env: Record<string, string | undefined>): string;
export function countFiles(dir: string): number;
export function pagesUrl(project: string): string;
export function firstPagesUrl(text: string): string | null;
export function runDeploy(opts?: { env?: Record<string, string | undefined>; argv?: string[]; cwd?: string; out?: (s: string) => void; err?: (s: string) => void }): Promise<number>;
