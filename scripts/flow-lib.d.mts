export interface FlowStage {
  n: number;
  name: string;
  description: string;
  gate?: { name: string; text: string };
}
export interface FlowData {
  title: string;
  stages: FlowStage[];
  relation: string;
  failLabel: string;
}
export const FLOW_FILE: string;
export function buildFlow(chapter: string): FlowData;
export function buildFlowFromContent(dir: string): FlowData;
export function serializeFlow(data: FlowData): string;
