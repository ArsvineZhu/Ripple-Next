export function nextTabId<Id>(visible: readonly Id[], current: Id, direction: number): Id {
  if (!visible.length) return current;
  const index = visible.indexOf(current);
  return visible[(index + direction + visible.length) % visible.length] ?? visible[0];
}
