/** Normalized string similarity for resolver fuzzy matching (0–1). */
export function similarityRatio(a: string, b: string): number {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshteinDistance(left, right);
  const maxLen = Math.max(left.length, right.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0),
  );

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function bestFuzzyMatches<T>(
  hint: string,
  items: T[],
  getLabel: (item: T) => string,
  threshold: number,
  maxResults: number,
): Array<{ item: T; score: number }> {
  const scored = items
    .map((item) => ({
      item,
      score: similarityRatio(hint, getLabel(item)),
    }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults);
}
