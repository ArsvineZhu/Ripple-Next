import type { PageSize } from '../../shared/pages';

interface PageDefinition<Context> {
  id: string;
  layout: PageSize | ((context: Context) => PageSize);
  available?: (context: Context) => boolean;
  radius?: number;
}

/** Registry consumers depend on identities and callbacks, never ordinal page numbers. */
export function createPageRegistry<Context, Definition extends PageDefinition<Context>>(
  definitions: readonly Definition[],
  fallbackId: string,
) {
  const byId = new Map(definitions.map((page) => [page.id, page]));
  if (byId.size !== definitions.length) throw new TypeError('Duplicate page ID');
  const fallback = byId.get(fallbackId);
  if (!fallback) throw new TypeError('Missing fallback page');
  const orderedIds = (order: readonly string[]) =>
    [...new Set([...order, ...byId.keys()])].filter((id) => byId.has(id));
  return {
    definitions,
    orderedIds,
    get: (id: string) => byId.get(id),
    size: (id: string, context: Context): PageSize => {
      const page = byId.get(id) ?? fallback;
      const size = typeof page.layout === 'function' ? page.layout(context) : page.layout;
      if (![size.width, size.height].every((value) => Number.isFinite(value) && value > 0))
        throw new TypeError('Invalid page size');
      return size;
    },
    radius: (id: string) => (byId.get(id) ?? fallback).radius ?? 30,
    visible: (order: readonly string[], hidden: readonly string[], context: Context) => {
      const available = (id: string) => {
        const page = byId.get(id);
        return !!page && (page.available?.(context) ?? true);
      };
      const ids = orderedIds(order);
      const visible = ids.filter((id) => !hidden.includes(id) && available(id));
      return visible.length ? visible : [fallbackId];
    },
  };
}
