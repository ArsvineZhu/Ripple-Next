const HISTORY_ENTRIES = 100;
const HISTORY_CHARACTERS = 1_000_000;

/** Session history keeps original text, bounded by count and total characters. */
export function updateClipboardHistory(history: string[], text: string): string[] {
  if (!/[^\s\p{Cf}]/u.test(text) || text.length > HISTORY_CHARACTERS || history[0] === text)
    return history;
  let characters = text.length;
  const next = [text];
  for (const item of history) {
    if (item === text) continue;
    if (next.length === HISTORY_ENTRIES || characters + item.length > HISTORY_CHARACTERS) break;
    next.push(item);
    characters += item.length;
  }
  return next;
}
