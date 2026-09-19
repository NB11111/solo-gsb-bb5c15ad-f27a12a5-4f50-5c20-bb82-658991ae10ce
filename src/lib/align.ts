import type { AlignGroup, GroupKind, SubEntry } from '../types';
import { normalize, similarityOfNormalized } from './similarity';

export interface AlignOptions {
  /** 单侧最大连续条数（1:N / N:1 中的 N 上限），默认 3 */
  maxGroupSize?: number;
  /** 单侧跳过一条字幕的惩罚分，默认 -0.3 */
  skipPenalty?: number;
  /** 组内每多出一条字幕的惩罚分（倾向 1:1），默认 0.04 */
  sizePenalty?: number;
  /** 置信度中时间重叠的权重，默认 0.45（文本权重 = 1 - 该值） */
  timeWeight?: number;
  /** 低于该置信度的匹配组标记为冲突，默认 0.65 */
  conflictThreshold?: number;
}

interface Window {
  startMs: number;
  endMs: number;
  norm: string;
}

/** DP 状态数上限（防止超大文件撑爆内存） */
const MAX_CELLS = 9_000_000;

/** 两个时间区间的交并比 IoU */
export function timeIoU(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const inter = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  if (inter <= 0) return 0;
  const union = Math.max(aEnd, bEnd) - Math.min(aStart, bStart);
  return union > 0 ? inter / union : 0;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function windowOf(entries: SubEntry[]): Window {
  let startMs = Infinity;
  let endMs = -Infinity;
  const texts: string[] = [];
  for (const e of entries) {
    if (e.startMs < startMs) startMs = e.startMs;
    if (e.endMs > endMs) endMs = e.endMs;
    texts.push(e.text);
  }
  return { startMs, endMs, norm: normalize(texts.join(' ')) };
}

/** windows[i][k-1] = 合并 entries[i .. i+k-1] 的时间范围与归一化文本 */
function buildWindows(entries: SubEntry[], k: number): Window[][] {
  const out: Window[][] = new Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    const list: Window[] = [];
    let startMs = entries[i].startMs;
    let endMs = entries[i].endMs;
    let text = '';
    for (let size = 1; size <= k && i + size <= entries.length; size++) {
      const e = entries[i + size - 1];
      if (e.startMs < startMs) startMs = e.startMs;
      if (e.endMs > endMs) endMs = e.endMs;
      text = size === 1 ? e.text : `${text} ${e.text}`;
      list.push({ startMs, endMs, norm: normalize(text) });
    }
    out[i] = list;
  }
  return out;
}

export interface GroupStats {
  confidence: number;
  timeOverlap: number;
  textSim: number;
}

/** 计算一组（a 侧若干条 vs b 侧若干条）的匹配置信度 */
export function groupStats(a: SubEntry[], b: SubEntry[], timeWeight = 0.45): GroupStats {
  const wa = windowOf(a);
  const wb = windowOf(b);
  const timeOverlap = timeIoU(wa.startMs, wa.endMs, wb.startMs, wb.endMs);
  const textSim = similarityOfNormalized(wa.norm, wb.norm);
  return {
    confidence: clamp01(timeWeight * timeOverlap + (1 - timeWeight) * textSim),
    timeOverlap,
    textSim,
  };
}

/**
 * 顺序对齐两份字幕。
 *
 * 动态规划：dp[i][j] = 对齐 A 前 i 条与 B 前 j 条的最大总分。
 * 转移：1:1 匹配、1:k（k=2..K）、k:1、跳过 A 一条、跳过 B 一条。
 * 每组得分 = 时间权重 * 时间IoU + 文本权重 * 文本相似度 - 组大小惩罚。
 * 回溯得到 1:1 / 1:N / N:1 / A-only / B-only 组序列，保持原始顺序。
 */
export function alignSubtitles(
  aEntries: SubEntry[],
  bEntries: SubEntry[],
  options: AlignOptions = {},
): AlignGroup[] {
  const K = options.maxGroupSize ?? 3;
  const skipPenalty = options.skipPenalty ?? -0.3;
  const sizePenalty = options.sizePenalty ?? 0.04;
  const tw = options.timeWeight ?? 0.45;
  const conflictThreshold = options.conflictThreshold ?? 0.65;

  const n = aEntries.length;
  const m = bEntries.length;
  if (n === 0 && m === 0) return [];
  const cells = (n + 1) * (m + 1);
  if (cells > MAX_CELLS) {
    throw new Error(`字幕条目过多（${n} × ${m}），超出对齐能力上限，请拆分文件后分批处理`);
  }

  const wa = buildWindows(aEntries, K);
  const wb = buildWindows(bEntries, K);

  const pairScore = (aw: Window, bw: Window, extra: number): number => {
    const t = timeIoU(aw.startMs, aw.endMs, bw.startMs, bw.endMs);
    const s = similarityOfNormalized(aw.norm, bw.norm);
    return tw * t + (1 - tw) * s - sizePenalty * extra;
  };

  const width = m + 1;
  const dp = new Float64Array(cells).fill(-1e9);
  const move = new Uint8Array(cells);
  const at = (i: number, j: number): number => i * width + j;
  dp[0] = 0;

  // 移动编码：0=1:1；1..K-1 = 1:(code+1)；K..2K-2 = (code-K+2):1；2K-1=跳过A；2K=跳过B
  const SKIP_A = 2 * K - 1;
  const SKIP_B = 2 * K;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const cur = dp[at(i, j)];
      if (cur <= -1e9) continue;
      const relax = (ni: number, nj: number, val: number, code: number): void => {
        const t = at(ni, nj);
        if (val > dp[t]) {
          dp[t] = val;
          move[t] = code;
        }
      };
      if (i < n && j < m) relax(i + 1, j + 1, cur + pairScore(wa[i][0], wb[j][0], 0), 0);
      for (let k = 2; k <= K && i < n && j + k <= m; k++) {
        relax(i + 1, j + k, cur + pairScore(wa[i][0], wb[j][k - 1], k - 1), k - 1);
      }
      for (let k = 2; k <= K && j < m && i + k <= n; k++) {
        relax(i + k, j + 1, cur + pairScore(wa[i][k - 1], wb[j][0], k - 1), K + k - 2);
      }
      if (i < n) relax(i + 1, j, cur + skipPenalty, SKIP_A);
      if (j < m) relax(i, j + 1, cur + skipPenalty, SKIP_B);
    }
  }

  // 回溯
  const steps: Array<{ aCount: number; bCount: number }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const code = move[at(i, j)];
    let aCount: number;
    let bCount: number;
    if (code === 0) {
      aCount = 1;
      bCount = 1;
    } else if (code < K) {
      aCount = 1;
      bCount = code + 1;
    } else if (code === SKIP_A) {
      aCount = 1;
      bCount = 0;
    } else if (code === SKIP_B) {
      aCount = 0;
      bCount = 1;
    } else {
      aCount = code - K + 2;
      bCount = 1;
    }
    steps.push({ aCount, bCount });
    i -= aCount;
    j -= bCount;
  }
  steps.reverse();

  const groups: AlignGroup[] = [];
  let ai = 0;
  let bi = 0;
  for (const step of steps) {
    const a = aEntries.slice(ai, ai + step.aCount);
    const b = bEntries.slice(bi, bi + step.bCount);
    let kind: GroupKind;
    let confidence = 1;
    let timeOverlap = 1;
    let textSim = 1;
    let conflict = false;
    if (a.length > 0 && b.length > 0) {
      kind = a.length === 1 && b.length === 1 ? '1:1' : a.length === 1 ? '1:N' : 'N:1';
      const stats = groupStats(a, b, tw);
      confidence = stats.confidence;
      timeOverlap = stats.timeOverlap;
      textSim = stats.textSim;
      conflict = confidence < conflictThreshold;
    } else {
      kind = a.length > 0 ? 'A-only' : 'B-only';
    }
    groups.push({ id: groups.length, kind, a, b, confidence, timeOverlap, textSim, conflict });
    ai += step.aCount;
    bi += step.bCount;
  }
  return groups;
}
