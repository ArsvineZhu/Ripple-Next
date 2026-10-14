import { describe, expect, it } from 'vitest';
import { createSearchUrl, isValidSearchUrlTemplate } from '../../../src/renderer/lib/search';

describe('browser search destinations', () => {
  it('inserts encoded search terms into a custom HTTP(S) template', () => {
    const template = 'https://duckduckgo.com/?q={query}';
    const destination = createSearchUrl('cats & dogs', template);

    expect(destination).not.toBeNull();
    expect(new URL(destination!).searchParams.get('q')).toBe('cats & dogs');
  });

  it('keeps direct URLs separate from search terms', () => {
    expect(createSearchUrl('example.com/guide', 'https://duckduckgo.com/?q={query}')).toBe(
      'https://example.com/guide',
    );
    expect(createSearchUrl('https://example.com/a path', 'https://duckduckgo.com/?q={query}')).toBe(
      'https://example.com/a%20path',
    );
  });

  it('requires a query placeholder and an HTTP(S) template', () => {
    expect(isValidSearchUrlTemplate('https://search.example/?q={query}')).toBe(true);
    expect(isValidSearchUrlTemplate('https://search.example/')).toBe(false);
    expect(isValidSearchUrlTemplate('file:///tmp/search?q={query}')).toBe(false);
    expect(createSearchUrl('hello', 'file:///tmp/search?q={query}')).toBeNull();
  });
});
