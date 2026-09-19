import { describe, expect, it } from 'vitest';
import type { SubEntry } from '../../types';
import { alignSubtitles, timeIoU } from '../align';

let seq = 0;
function entry(startMs: number, endMs: number, text: string): SubEntry {
  return { index: ++seq, startMs, endMs, text };
}

describe('timeIoU', () => {
  it('完全重叠为 1，无重叠为 0', () => {
    expect(timeIoU(0, 10, 0, 10)).toBe(1);
    expect(timeIoU(0, 10, 10, 20)).toBe(0);
    expect(timeIoU(0, 10, 5, 15)).toBeCloseTo(5 / 15);
  });
});

describe('alignSubtitles', () => {
  it('相同序列全部 1:1 且无冲突', () => {
    const texts = ['Hello world', 'How are you', 'Goodbye'];
    const a = texts.map((t, i) => entry(i * 2000, i * 2000 + 1500, t));
    const b = texts.map((t, i) => entry(i * 2000 + 100, i * 2000 + 1600, t));
    const groups = alignSubtitles(a, b);
    expect(groups.map((g) => g.kind)).toEqual(['1:1', '1:1', '1:1']);
    expect(groups.every((g) => !g.conflict)).toBe(true);
    expect(groups[0].confidence).toBeGreaterThan(0.9);
  });

  it('识别一对多（B 拆分）', () => {
    const a = [entry(0, 2000, 'This is a long sentence')];
    const b = [entry(0, 900, 'This is a'), entry(900, 2100, 'long sentence')];
    const groups = alignSubtitles(a, b);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('1:N');
    expect(groups[0].b).toHaveLength(2);
  });

  it('识别多对一（A 拆分）', () => {
    const a = [entry(0, 900, 'Final line part one,'), entry(900, 2000, 'and part two.')];
    const b = [entry(0, 2100, 'Final line part one, and part two.')];
    const groups = alignSubtitles(a, b);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('N:1');
    expect(groups[0].a).toHaveLength(2);
  });

  it('单侧存在的字幕标记为 A-only / B-only 且不算冲突', () => {
    const a = [entry(0, 1000, 'Hello world')];
    const b = [entry(0, 1000, 'Hello world'), entry(2000, 3000, 'Extra line only in B')];
    const groups = alignSubtitles(a, b);
    expect(groups.map((g) => g.kind)).toEqual(['1:1', 'B-only']);
    expect(groups[1].conflict).toBe(false);
  });

  it('文本差异大的匹配组标记为冲突', () => {
    const a = [entry(0, 2000, 'A conflict line here.')];
    const b = [entry(100, 2100, 'A completely different sentence that conflicts.')];
    const groups = alignSubtitles(a, b);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('1:1');
    expect(groups[0].conflict).toBe(true);
    expect(groups[0].confidence).toBeLessThan(0.65);
  });

  it('保持顺序（对齐组按时间先后排列）', () => {
    const a = [entry(0, 1000, 'First line'), entry(2000, 3000, 'Second line')];
    const b = [entry(0, 1000, 'First line'), entry(2000, 3000, 'Second line')];
    const groups = alignSubtitles(a, b);
    expect(groups[0].a[0].text).toBe('First line');
    expect(groups[1].a[0].text).toBe('Second line');
  });

  it('空输入返回空数组', () => {
    expect(alignSubtitles([], [])).toEqual([]);
    const groups = alignSubtitles([entry(0, 1000, 'only A')], []);
    expect(groups.map((g) => g.kind)).toEqual(['A-only']);
  });
});
