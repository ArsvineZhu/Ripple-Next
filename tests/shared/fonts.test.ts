import { expect, it } from 'vitest';
import { AppStateSchema, defaultAppState } from '../../src/shared/appState';
import { UiFontSchema, appendFonts, fontStack, type FontChoice } from '../../src/shared/fonts';

it.each(['default', 'system', 'openrunde'] as const)(
  'loads an existing %s preference into the ordered font list',
  (id) => {
    const state = AppStateSchema.parse({
      ...defaultAppState,
      settings: { ...defaultAppState.settings, uiFont: id },
    });
    expect(state.settings.uiFont).toEqual([{ kind: 'builtin', id }]);
  },
);
it('preserves explicit font order and escapes a family name without introducing earlier system fallbacks', () => {
  const fonts: FontChoice[] = [
    { kind: 'builtin', id: 'openrunde' },
    { kind: 'system', family: 'Custom, 字体' },
  ];
  expect(fontStack(fonts)).toBe('"OpenRunde", "Custom, 字体"');
  expect(fontStack([...fonts].reverse())).toBe('"Custom, 字体", "OpenRunde"');
  expect(fontStack([{ kind: 'system', family: 'A"B' }])).toBe('"A\\"B"');
  expect(UiFontSchema.safeParse([]).success).toBe(false);
  expect(UiFontSchema.safeParse([fonts[0], fonts[0]]).success).toBe(false);
});
it('merges styles of an imported family without moving it or repeating the same file', () => {
  const regular: FontChoice = {
    kind: 'file',
    family: 'Example',
    faces: [{ id: 'a'.repeat(64), weight: [400, 400], style: 'normal' }],
  };
  const bold: FontChoice = {
    kind: 'file',
    family: 'Example',
    faces: [{ id: 'b'.repeat(64), weight: [700, 700], style: 'normal' }],
  };
  const merged = appendFonts([{ kind: 'builtin', id: 'openrunde' }, regular], [regular, bold]);
  expect(merged).toEqual([
    { kind: 'builtin', id: 'openrunde' },
    { ...regular, faces: [...regular.faces, ...bold.faces] },
  ]);
});
