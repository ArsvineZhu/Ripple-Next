const textMeasureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function measureTextWidth(text: string, font: string | number = 13, weight = 600) {
  if (!textMeasureCanvas || !textMeasureCanvas.getContext) return 0;
  const ctx = textMeasureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font =
    typeof font === 'number'
      ? `${weight} ${font}px ${getComputedStyle(document.getElementById('Island') || document.documentElement).fontFamily}`
      : font;
  return ctx.measureText(text).width;
}
