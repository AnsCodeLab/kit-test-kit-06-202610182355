export type Rule = { pattern: string; set: [string, string][]; detach: string[] };
export function parseHeaders(text: string): Rule[];
export function headersFor(rules: Rule[], urlPath: string): Record<string, string>;
export function startHeadersServer(dir?: string): Promise<{ url: string; close: () => Promise<void> }>;
