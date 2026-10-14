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
  it('replaces generated counter names in presentation while retaining stored names', () => {
    const entries = [
      { id: 12, label: 'API key #12' },
      { id: 20, label: 'Work' },
    ];
    expect(aiDisplayLabel(entries, entries[0], 'API key', 'API key')).toBe('#1 · API key');
    expect(aiDisplayLabel(entries, entries[1], 'API key', 'API key')).toBe('#2 · Work');
    expect(entries[0].label).toBe('API key #12');
    const endpoint = { id: 17, label: 'completion #17' };
    expect(aiDisplayLabel([endpoint], endpoint, 'OpenAI', 'completion')).toBe('#1 · OpenAI');
  });
});
