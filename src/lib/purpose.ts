/**
 * One-line purpose of a skill: the description up to its first sentence end.
 * Whitespace is collapsed; the words are never rewritten.
 */
export function purpose(description: string): string {
  const text = description.replace(/\s+/g, ' ').trim();
  const match = /^.*?[.!?](?=\s+[A-Z"(`]|$)/.exec(text);
  return match ? match[0] : text;
}
