import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInteractiveTarget } from '../../../src/renderer/lib/interactions';
class DOMElement extends EventTarget {
  constructor(
    public tagName: string,
    private button: DOMElement | null = null,
  ) {
    super();
  }
  closest(selector: string) {
    return selector === 'button' ? this.button : null;
  }
}
class HTMLElementFixture extends DOMElement {}
class SVGElementFixture extends DOMElement {}
afterEach(() => vi.unstubAllGlobals());
describe('Island interactive targets', () => {
  it('recognizes SVG icons nested in buttons without treating them as HTML elements', () => {
    vi.stubGlobal('Element', DOMElement);
    vi.stubGlobal('HTMLElement', HTMLElementFixture);
    const icon = new SVGElementFixture('svg', new HTMLElementFixture('BUTTON'));
    expect(Boolean(isInteractiveTarget(icon))).toBe(true);
  });
  it('keeps inputs interactive and the empty shell toggleable', () => {
    vi.stubGlobal('Element', DOMElement);
    expect(Boolean(isInteractiveTarget(new HTMLElementFixture('INPUT')))).toBe(true);
    expect(Boolean(isInteractiveTarget(new HTMLElementFixture('DIV')))).toBe(false);
    expect(Boolean(isInteractiveTarget(new EventTarget()))).toBe(false);
  });
});
