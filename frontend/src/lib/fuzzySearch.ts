// Forgiving name search used by the report lists (staff and partners).
//
// A query matches a name when EVERY word typed matches SOME word of the
// name, in any order, ignoring case and accents ("jose" finds "José"). A
// typed word matches when it is the start of a name word, appears inside
// it, or is within a small typo distance of it ("rodriguez" ~ "rodrigez",
// "maria" ~ "mraia"), so close-but-not-exact spellings still turn up.

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

// Optimal string alignment distance: Levenshtein + adjacent transpositions.
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function allowedTypos(token: string): number {
  if (token.length < 3) return 0;
  if (token.length < 6) return 1;
  return 2;
}

// 3 = prefix, 2 = substring, 1 = approximate, 0 = no match.
function tokenScore(token: string, word: string): number {
  if (word.startsWith(token)) return 3;
  if (word.includes(token)) return 2;
  const max = allowedTypos(token);
  if (max === 0) return 0;
  // Compare against the whole word and against a same-length prefix, so a
  // misspelled partial ("rodrig" vs "rodriguez") still counts.
  const prefix = word.slice(0, token.length);
  if (editDistance(token, word) <= max || editDistance(token, prefix) <= max) return 1;
  return 0;
}

/** Score of `name` against `query`: 0 = no match, higher = better. */
export function matchScore(query: string, name: string): number {
  const tokens = words(query);
  if (tokens.length === 0) return 1;
  const nameWords = words(name);
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const w of nameWords) {
      best = Math.max(best, tokenScore(t, w));
      if (best === 3) break;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** Items whose `getText` matches `query`, best matches first (stable for
 *  equal scores). An empty query returns the items unchanged. */
export function fuzzyFilter<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  if (!normalize(query)) return items;
  return items
    .map((item, index) => ({ item, index, score: matchScore(query, getText(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
