import { expect, it } from 'vitest';
import { updateClipboardHistory } from '../src/renderer/lib/clipboard';
it('filters empty/image-only reads while preserving meaningful text and history', () => {
  const history = ['https://example.com'];
  for (const empty of ['', ' \n\t', '\u200b\u200d']) {
    expect(updateClipboardHistory(history, empty)).toBe(history);
    expect(updateClipboardHistory([], empty)).toEqual([]);
  }
  expect(updateClipboardHistory(history, history[0]!)).toBe(history);
  expect(updateClipboardHistory(history, '  code\n')).toEqual(['  code\n', ...history]);
  expect(updateClipboardHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  expect(
    updateClipboardHistory(
      Array.from({ length: 100 }, (_, i) => String(i)),
      'new',
    ),
  ).toHaveLength(100);
  expect(updateClipboardHistory(['a'.repeat(600_000)], 'b'.repeat(600_000))).toEqual([
    'b'.repeat(600_000),
  ]);
  expect(updateClipboardHistory(history, 'a'.repeat(1_000_001))).toBe(history);
});
