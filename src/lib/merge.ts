import type { AlignGroup, MergedEntry, Resolution } from '../types';

/** 默认取舍：文本用 A，时间轴用并集；非冲突组自动确认 */
export function defaultResolution(group: AlignGroup): Resolution {
  return { textFrom: 'A', timeFrom: 'union', resolved: !group.conflict };
}

function rangeOf(entries: { startMs: number; endMs: number }[]): { startMs: number; endMs: number } {
  let startMs = Infinity;
  let endMs = -Infinity;
  for (const e of entries) {
    if (e.startMs < startMs) startMs = e.startMs;
    if (e.endMs > endMs) endMs = e.endMs;
  }
  return { startMs, endMs };
}

function joinTexts(entries: { text: string }[]): string {
  return entries.map((e) => e.text).join('\n');
}

/** 按取舍方案把一个对齐组转换为 1~2 条输出字幕 */
export function resolveEntries(group: AlignGroup, resolution: Resolution): MergedEntry[] {
  const onlyA = group.b.length === 0;
  const onlyB = group.a.length === 0;
  const textFrom = onlyA ? 'A' : onlyB ? 'B' : resolution.textFrom;

  if (textFrom === 'both') {
    // 双方文本都保留：各自使用原时间轴，输出两条
    const ra = rangeOf(group.a);
    const rb = rangeOf(group.b);
    return [
      { groupId: group.id, startMs: ra.startMs, endMs: ra.endMs, text: joinTexts(group.a) },
      { groupId: group.id, startMs: rb.startMs, endMs: rb.endMs, text: joinTexts(group.b) },
    ];
  }

  const timeFrom = onlyA ? 'A' : onlyB ? 'B' : resolution.timeFrom;
  const text = joinTexts(textFrom === 'A' ? group.a : group.b);
  const range =
    timeFrom === 'A'
      ? rangeOf(group.a)
      : timeFrom === 'B'
        ? rangeOf(group.b)
        : rangeOf([...group.a, ...group.b]);
  return [{ groupId: group.id, startMs: range.startMs, endMs: range.endMs, text }];
}

/** 生成合并后的字幕序列（按开始时间排序，导出时统一重新编号） */
export function buildMergedEntries(
  groups: AlignGroup[],
  resolutions: Record<number, Resolution>,
): MergedEntry[] {
  const out: MergedEntry[] = [];
  for (const g of groups) {
    out.push(...resolveEntries(g, resolutions[g.id] ?? defaultResolution(g)));
  }
  out.sort((x, y) => x.startMs - y.startMs || x.endMs - y.endMs);
  return out;
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

/** 校验合并结果：时间必须单调不减、结束大于开始、相邻不重叠 */
export function validateMerged(entries: MergedEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  entries.forEach((e, i) => {
    const no = i + 1;
    if (e.endMs <= e.startMs) {
      issues.push({ level: 'error', message: `第 ${no} 条：结束时间必须大于开始时间` });
    }
    if (i > 0) {
      const prev = entries[i - 1];
      if (e.startMs < prev.startMs) {
        issues.push({ level: 'error', message: `第 ${no} 条：开始时间早于第 ${i} 条，时间轴非单调` });
      } else if (e.startMs < prev.endMs) {
        issues.push({ level: 'error', message: `第 ${no} 条：与第 ${i} 条时间重叠` });
      }
    }
  });
  return issues;
}

/** 自动修复：排序后裁剪重叠（开始时间不早于上一条结束），并保证结束大于开始 */
export function autoFixEntries(entries: MergedEntry[]): MergedEntry[] {
  const sorted = [...entries]
    .sort((x, y) => x.startMs - y.startMs || x.endMs - y.endMs)
    .map((e) => ({ ...e }));
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (i > 0 && e.startMs < sorted[i - 1].endMs) {
      e.startMs = sorted[i - 1].endMs;
    }
    if (e.endMs <= e.startMs) {
      e.endMs = e.startMs + 1;
    }
  }
  return sorted;
}
