const DEFAULT_LIMIT = 20_000;

/** 把一条行动备忘追加到已有文本。重复条目不追加，并限制总长度。 */
export function appendActionMemo(current: string, entry: string, limit = DEFAULT_LIMIT): string {
  const next = entry.trim();
  if (!next) return current;
  if (current.includes(next)) return current;
  const base = current.trim();
  const joined = base ? `${base}\n\n${next}` : next;
  return joined.slice(0, limit);
}
