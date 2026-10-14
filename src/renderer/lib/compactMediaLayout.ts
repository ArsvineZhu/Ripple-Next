// Two 9px insets, 24px artwork and a 6px gap. Hover adds a gap and a 31px control.
const COMPACT_MEDIA_CHROME_WIDTH = 48;
const COMPACT_MEDIA_CONTROL_WIDTH = 37;

export function compactMediaWidth(textWidth: number, quick: boolean) {
  const idle = Math.min(300, Math.max(122, Math.ceil(textWidth + COMPACT_MEDIA_CHROME_WIDTH)));
  return idle + (quick ? COMPACT_MEDIA_CONTROL_WIDTH : 0);
}
