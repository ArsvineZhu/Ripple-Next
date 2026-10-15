export const RGB_HEX = /^#[\da-f]{6}$/i;

/** Native choosers return RGB; persisted CSS colors can also carry alpha. */
export function parseColor(value: string): { hex: string; alpha: number } | null {
  const source = value.trim();
  if (source === 'transparent') return { hex: '#000000', alpha: 0 };
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(source)?.[1];
  if (hex) {
    const expanded = hex.length < 5 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      hex: `#${expanded.slice(0, 6).toUpperCase()}`,
      alpha: expanded.length === 8 ? parseInt(expanded.slice(6), 16) / 255 : 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i
    .exec(source)?.[1]
    .trim()
    .split(/[\s,/]+/);
  if (!rgb || (rgb.length !== 3 && rgb.length !== 4)) return null;
  const channel = (part: string, maximum: number) => {
    if (!/^[+-]?(?:\d*\.)?\d+%?$/.test(part)) return NaN;
    const n = part.endsWith('%') ? (parseFloat(part) * maximum) / 100 : parseFloat(part);
    return Math.max(0, Math.min(maximum, n));
  };
  const components = rgb.slice(0, 3).map((part) => channel(part, 255));
  const alpha = rgb[3] === undefined ? 1 : channel(rgb[3], 1);
  if (![...components, alpha].every(Number.isFinite)) return null;
  return {
    hex: `#${components
      .map((n) => Math.round(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`,
    alpha,
  };
}

export function colorWithAlpha(hex: string, alpha: number) {
  if (!RGB_HEX.test(hex) || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
    throw new TypeError('Invalid color');
  if (alpha === 1) return hex.toUpperCase();
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${rgb.join(', ')}, ${alpha})`;
}
