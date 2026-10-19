export interface ReplayData {
  command: string;
  steps: { label: string; value: string }[];
  confirm: string;
  answer: string;
  files: { path: string; step: string }[];
}
export const REPLAY_FILE: string;
export function hasReplayInputs(): boolean;
export function buildReplay(quickstart: string, readme: string): ReplayData;
export function buildReplayFromContent(dir: string): ReplayData;
export function serializeReplay(data: ReplayData): string;
