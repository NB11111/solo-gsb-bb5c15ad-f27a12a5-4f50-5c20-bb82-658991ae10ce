import { describe, expect, it } from 'vitest';
import { formatTime, parseSrt, serializeSrt } from '../srt';

describe('parseSrt', () => {
  it('解析基本块', () => {
    const src = '1\n00:00:01,000 --> 00:00:02,500\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n';
    const { entries, warnings } = parseSrt(src);
    expect(warnings).toHaveLength(0);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ index: 1, startMs: 1000, endMs: 2500, text: 'Hello' });
    expect(entries[1]).toMatchObject({ index: 2, startMs: 3000, endMs: 4000, text: 'World' });
  });

  it('兼容 BOM、CRLF 与点号毫秒', () => {
    const src = '﻿1\r\n00:00:01.000 --> 00:00:02.000\r\nHi\r\n';
    const { entries } = parseSrt(src);
    expect(entries).toHaveLength(1);
    expect(entries[0].startMs).toBe(1000);
    expect(entries[0].endMs).toBe(2000);
  });

  it('保留多行文本', () => {
    const src = '1\n00:00:01,000 --> 00:00:02,000\nline1\nline2\n';
    expect(parseSrt(src).entries[0].text).toBe('line1\nline2');
  });

  it('按开始时间排序并保留原序号', () => {
    const src =
      '1\n00:00:05,000 --> 00:00:06,000\nlater\n\n2\n00:00:01,000 --> 00:00:02,000\nearlier\n';
    const { entries } = parseSrt(src);
    expect(entries[0].text).toBe('earlier');
    expect(entries[0].index).toBe(2);
  });

  it('无法解析的块产生警告而不中断', () => {
    const src = 'not a subtitle block\n\n1\n00:00:01,000 --> 00:00:02,000\nok\n';
    const { entries, warnings } = parseSrt(src);
    expect(entries).toHaveLength(1);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('formatTime', () => {
  it('格式化时间', () => {
    expect(formatTime(0)).toBe('00:00:00,000');
    expect(formatTime(3_723_456)).toBe('01:02:03,456');
  });
});

describe('serializeSrt', () => {
  it('从 1 重新编号并可被解析回读', () => {
    const out = serializeSrt([
      { startMs: 0, endMs: 1000, text: 'a' },
      { startMs: 1000, endMs: 2000, text: 'b' },
    ]);
    expect(out).toBe('1\n00:00:00,000 --> 00:00:01,000\na\n\n2\n00:00:01,000 --> 00:00:02,000\nb\n');
    const { entries } = parseSrt(out);
    expect(entries).toHaveLength(2);
    expect(entries[1].text).toBe('b');
  });
});
