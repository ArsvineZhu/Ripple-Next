import { useEffect, useRef } from 'react';
import { fontFamily, fontFileUrl, fontStack, type FontChoice } from '../../shared/fonts';

export function useUIFont(fonts: FontChoice[], reportError: (family: string) => void): void {
  const registrations = useRef(new Map<string, FontFace>());
  const signature = JSON.stringify(fonts);
  useEffect(() => {
    const selected: FontChoice[] = JSON.parse(signature);
    document.documentElement.style.setProperty('--font-ui', fontStack(selected));
    document.documentElement.toggleAttribute(
      'data-custom-ui-font',
      !(selected.length === 1 && selected[0].kind === 'builtin' && selected[0].id === 'default'),
    );
    if (typeof FontFace === 'undefined') return;
    const wanted = new Set<string>();
    for (const font of selected) {
      if (font.kind !== 'file') continue;
      for (const face of font.faces) {
        const family = fontFamily(font);
        const key = `${family}:${face.id}:${face.weight.join('-')}:${face.style}`;
        wanted.add(key);
        if (registrations.current.has(key)) continue;
        const [min, max] = face.weight;
        const registered = new FontFace(family, `url(${JSON.stringify(fontFileUrl(face.id))})`, {
          weight: min === max ? String(min) : `${min} ${max}`,
          style: face.style,
          display: 'swap',
        });
        registrations.current.set(key, registered);
        document.fonts.add(registered);
        void registered.load().catch(() => {
          if (registrations.current.get(key) === registered) reportError(font.family);
        });
      }
    }
    for (const [key, face] of registrations.current)
      if (!wanted.has(key)) {
        document.fonts.delete(face);
        registrations.current.delete(key);
      }
  }, [signature, reportError]);
  useEffect(() => {
    const owned = registrations.current;
    return () => {
      for (const face of owned.values()) document.fonts.delete(face);
      owned.clear();
    };
  }, []);
}
