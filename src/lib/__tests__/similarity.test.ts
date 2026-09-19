import { describe, expect, it } from 'vitest';
import { normalize, textSimilarity } from '../similarity';

describe('normalize', () => {
  it('去除标签与标点并小写化', () => {
    expect(normalize('<i>Hello,</i> World!')).toBe('hello world');
    expect(normalize('{\\an8}你好，世界！')).toBe('你好 世界');
  });
});

describe('textSimilarity', () => {
  it('完全相同为 1', () => {
    expect(textSimilarity('Hello world', 'Hello world')).toBe(1);
  });

  it('忽略标点差异', () => {
    expect(textSimilarity('Hello, world.', 'Hello world!')).toBe(1);
  });

  it('一侧为空为 0，两侧为空为 1', () => {
    expect(textSimilarity('a', '')).toBe(0);
    expect(textSimilarity('', '')).toBe(1);
  });

  it('相似文本得分高', () => {
    expect(textSimilarity('This is a demo subtitle file.', 'This is a demo subtitle file!')).toBeGreaterThan(0.9);
  });

  it('不同文本得分低', () => {
    expect(textSimilarity('A conflict line here.', 'A completely different sentence.')).toBeLessThan(0.5);
  });

  it('支持中文', () => {
    expect(textSimilarity('今天天气很好', '今天天气非常好')).toBeGreaterThan(0.6);
    expect(textSimilarity('今天天气很好', '昨天下了大雨')).toBeLessThan(0.5);
  });
});
