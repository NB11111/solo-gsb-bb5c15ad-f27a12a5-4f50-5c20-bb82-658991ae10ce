/**
 * 文本相似度：字符二元组 Dice 系数 + 归一化 Levenshtein 的加权组合。
 * 归一化时去除 HTML/ASS 标签与标点，对中英文都适用。
 */

export function normalize(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bigramCounts(s: string): Map<string, number> {
  const map = new Map<string, number>();
  const compact = s.replace(/\s+/g, '');
  if (compact.length === 1) {
    map.set(compact, 1);
    return map;
  }
  for (let i = 0; i < compact.length - 1; i++) {
    const bg = compact.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

export function diceCoefficient(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ca = bigramCounts(a);
  const cb = bigramCounts(b);
  let totalA = 0;
  let totalB = 0;
  for (const v of ca.values()) totalA += v;
  for (const v of cb.values()) totalB += v;
  if (totalA + totalB === 0) return 0;
  const [small, big] = ca.size <= cb.size ? [ca, cb] : [cb, ca];
  let overlap = 0;
  for (const [k, v] of small) {
    overlap += Math.min(v, big.get(k) ?? 0);
  }
  return (2 * overlap) / (totalA + totalB);
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  let prev = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    const cur = new Array<number>(lb + 1);
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return 1 - prev[lb] / Math.max(la, lb);
}

/** 输入需已归一化 */
export function similarityOfNormalized(na: string, nb: string): number {
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const dice = diceCoefficient(na, nb);
  // 超长文本只用 Dice，避免 O(n*m) 的 Levenshtein 开销
  if (na.length > 300 || nb.length > 300) return dice;
  const lev = levenshteinSimilarity(na, nb);
  return 0.5 * dice + 0.5 * lev;
}

export function textSimilarity(a: string, b: string): number {
  return similarityOfNormalized(normalize(a), normalize(b));
}
