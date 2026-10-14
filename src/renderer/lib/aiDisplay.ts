/** Display order is independent of the stable IDs used by mutations and encrypted keys. */
export function aiDisplayNumber(entries: readonly { id: number }[], id: number) {
  return entries.findIndex((entry) => entry.id === id) + 1;
}

export function aiDisplayLabel(
  entries: readonly { id: number }[],
  item: { id: number; label: string },
  fallback: string,
  automaticPrefix?: string,
) {
  const generated =
    automaticPrefix !== undefined && item.label.match(/^(.*) #\d+$/)?.[1] === automaticPrefix;
  return `#${aiDisplayNumber(entries, item.id)} · ${generated ? fallback : item.label || fallback}`;
}
