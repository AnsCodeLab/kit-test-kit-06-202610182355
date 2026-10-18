import { describe, it, expect } from 'vitest';
import { purpose } from '../../src/lib/purpose';
import { getSkills } from '../../src/lib/catalog';

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('purpose', () => {
  it('cuts at the first sentence end', () => {
    expect(purpose('First one. Second one.')).toBe('First one.');
  });
  it('keeps a single sentence whole and collapses folded lines', () => {
    expect(purpose('One\n  sentence only.')).toBe('One sentence only.');
  });
  it('does not cut at a full stop inside a word or file name', () => {
    expect(purpose('Writes CONTEXT.md and more. Then stops.')).toBe('Writes CONTEXT.md and more.');
  });
  it('does not cut at e.g. or etc. before lowercase text or a closing bracket', () => {
    expect(purpose('Models states (e.g. loading+error) so none leak. More.')).toBe('Models states (e.g. loading+error) so none leak.');
    expect(purpose('Fluent, etc.) and more. Next.')).toBe('Fluent, etc.) and more.');
  });
  it('returns the whole text when there is no sentence end', () => {
    expect(purpose('No end here')).toBe('No end here');
  });

  it('every skill in skills.yaml has a non-empty purpose that begins its description', () => {
    const skills = getSkills();
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      const p = purpose(skill.description);
      expect(p.length, skill.id).toBeGreaterThan(0);
      expect(normalize(skill.description).startsWith(p), skill.id).toBe(true);
    }
  });
});
