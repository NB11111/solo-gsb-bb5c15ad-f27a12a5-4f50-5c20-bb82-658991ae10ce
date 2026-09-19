import { describe, expect, it } from 'vitest';
import { parseSrt, serializeSrt } from '../lib/srt';
import { alignSubtitles } from '../lib/align';
import { autoFixEntries, buildMergedEntries, defaultResolution, validateMerged } from '../lib/merge';
import { DEMO_A, DEMO_B } from '../demo';

describe('内置演示数据端到端流程', () => {
  const a = parseSrt(DEMO_A).entries;
  const b = parseSrt(DEMO_B).entries;
  const groups = alignSubtitles(a, b);

  it('对齐结果覆盖 1:1 / 1:N / N:1 / 单侧 / 冲突', () => {
    const kinds = groups.map((g) => g.kind);
    expect(kinds).toContain('1:1');
    expect(kinds).toContain('1:N');
    expect(kinds).toContain('N:1');
    expect(kinds).toContain('B-only');
    expect(groups.some((g) => g.conflict)).toBe(true);
  });

  it('确认全部冲突后可导出时间单调的合法 SRT', () => {
    const resolutions = Object.fromEntries(
      groups.map((g) => [g.id, { ...defaultResolution(g), resolved: true }]),
    );
    const merged = buildMergedEntries(groups, resolutions);
    const fixed = autoFixEntries(merged);
    expect(validateMerged(fixed)).toHaveLength(0);
    const srt = serializeSrt(fixed);
    const roundtrip = parseSrt(srt);
    expect(roundtrip.entries).toHaveLength(fixed.length);
    // 重新编号后序号连续
    expect(roundtrip.entries.map((e) => e.index)).toEqual(fixed.map((_, i) => i + 1));
  });
});
