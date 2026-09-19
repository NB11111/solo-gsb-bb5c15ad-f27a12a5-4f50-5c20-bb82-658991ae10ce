import { describe, expect, it } from 'vitest';
import type { AlignGroup, Resolution, SubEntry } from '../../types';
import {
  autoFixEntries,
  buildMergedEntries,
  defaultResolution,
  validateMerged,
} from '../merge';

let seq = 0;
function entry(startMs: number, endMs: number, text: string): SubEntry {
  return { index: ++seq, startMs, endMs, text };
}

function group(partial: Partial<AlignGroup> & Pick<AlignGroup, 'a' | 'b'>): AlignGroup {
  return {
    id: seq++,
    kind: '1:1',
    confidence: 0.9,
    timeOverlap: 0.9,
    textSim: 0.9,
    conflict: false,
    ...partial,
  };
}

describe('defaultResolution', () => {
  it('非冲突自动确认，冲突待处理', () => {
    const ok = group({ a: [entry(0, 1, 'x')], b: [entry(0, 1, 'x')], conflict: false });
    const bad = group({ a: [entry(0, 1, 'x')], b: [entry(0, 1, 'y')], conflict: true });
    expect(defaultResolution(ok).resolved).toBe(true);
    expect(defaultResolution(bad).resolved).toBe(false);
  });
});

describe('buildMergedEntries', () => {
  it('按取舍选择文本与时间轴', () => {
    const g = group({
      id: 1,
      a: [entry(0, 1000, 'text A')],
      b: [entry(500, 2000, 'text B')],
    });
    const resolutions: Record<number, Resolution> = {
      1: { textFrom: 'B', timeFrom: 'B', resolved: true },
    };
    const out = buildMergedEntries([g], resolutions);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('text B');
    expect(out[0].startMs).toBe(500);
    expect(out[0].endMs).toBe(2000);
  });

  it('时间轴并集覆盖两侧', () => {
    const g = group({
      id: 2,
      a: [entry(0, 1000, 'text A')],
      b: [entry(500, 2000, 'text B')],
    });
    const out = buildMergedEntries([g], { 2: { textFrom: 'A', timeFrom: 'union', resolved: true } });
    expect(out[0].startMs).toBe(0);
    expect(out[0].endMs).toBe(2000);
  });

  it('「两者都保留」输出两条且各自用原时间轴', () => {
    const g = group({
      id: 3,
      a: [entry(0, 1000, 'text A')],
      b: [entry(500, 2000, 'text B')],
    });
    const out = buildMergedEntries([g], { 3: { textFrom: 'both', timeFrom: 'union', resolved: true } });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ startMs: 0, endMs: 1000, text: 'text A' });
    expect(out[1]).toMatchObject({ startMs: 500, endMs: 2000, text: 'text B' });
  });

  it('一对多保留多行文本', () => {
    const g = group({
      id: 4,
      kind: '1:N',
      a: [entry(0, 2000, 'whole')],
      b: [entry(0, 900, 'part1'), entry(900, 2000, 'part2')],
    });
    const out = buildMergedEntries([g], { 4: { textFrom: 'B', timeFrom: 'B', resolved: true } });
    expect(out[0].text).toBe('part1\npart2');
  });

  it('单侧组自动保留', () => {
    const g = group({ id: 5, kind: 'B-only', a: [], b: [entry(0, 1000, 'only B')] });
    const out = buildMergedEntries([g], {});
    expect(out[0].text).toBe('only B');
  });
});

describe('validateMerged / autoFixEntries', () => {
  it('检测重叠与非单调', () => {
    const entries = [
      { groupId: 1, startMs: 0, endMs: 2000, text: 'a' },
      { groupId: 2, startMs: 1000, endMs: 3000, text: 'b' },
    ];
    const issues = validateMerged(entries);
    expect(issues.some((i) => i.message.includes('重叠'))).toBe(true);

    const reversed = [
      { groupId: 1, startMs: 2000, endMs: 3000, text: 'a' },
      { groupId: 2, startMs: 0, endMs: 1000, text: 'b' },
    ];
    expect(validateMerged(reversed).some((i) => i.message.includes('非单调'))).toBe(true);
  });

  it('检测结束时间不大于开始时间', () => {
    const entries = [{ groupId: 1, startMs: 1000, endMs: 1000, text: 'a' }];
    expect(validateMerged(entries).length).toBeGreaterThan(0);
  });

  it('自动修复后校验通过且保持单调', () => {
    const entries = [
      { groupId: 1, startMs: 0, endMs: 2000, text: 'a' },
      { groupId: 2, startMs: 1000, endMs: 3000, text: 'b' },
      { groupId: 3, startMs: 2500, endMs: 2500, text: 'c' },
    ];
    const fixed = autoFixEntries(entries);
    expect(validateMerged(fixed)).toHaveLength(0);
    for (let i = 1; i < fixed.length; i++) {
      expect(fixed[i].startMs).toBeGreaterThanOrEqual(fixed[i - 1].endMs);
    }
  });
});
