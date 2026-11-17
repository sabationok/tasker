/** Rank rows by how many query words their text contains (case-insensitive), then by prefix match; empty query → first `limit`. */
export function rankTextMatches<T>(rows: T[], text: (row: T) => string, query: string, limit: number): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return rows.slice(0, limit);
  const q = query.trim().toLowerCase();
  return rows
    .map((row) => {
      const t = text(row).toLowerCase();
      const hits = words.filter((w) => t.includes(w)).length;
      return { row, score: hits * 10 + (t.startsWith(q) ? 5 : 0) + (t === q ? 5 : 0) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.row);
}
