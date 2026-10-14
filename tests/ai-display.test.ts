import { describe, expect, it } from 'vitest';
import { aiDisplayLabel, aiDisplayNumber } from '../src/renderer/lib/aiDisplay';

describe('AI display numbering', () => {
  it('compacts visible numbers after deletion without changing IDs or bindings', () => {
    const entries = [
      { id: 1, label: 'OpenAI' },
      { id: 4, label: 'My endpoint' },
    ];
    expect(aiDisplayLabel(entries, entries[1], 'Endpoint')).toBe('#2 · My endpoint');
    expect(aiDisplayNumber(entries, 4)).toBe(2);
    entries.shift();
    expect(aiDisplayLabel(entries, entries[0], 'Endpoint')).toBe('#1 · My endpoint');
    expect(entries[0].id).toBe(4);
    expect(aiDisplayNumber(entries, 99)).toBe(0);
  });
});
