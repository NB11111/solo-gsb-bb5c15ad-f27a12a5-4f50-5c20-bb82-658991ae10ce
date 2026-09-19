import type { ParsedSrt, SubEntry } from '../types';

const TIME_RE =
  /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

function toMs(h: string, m: string, s: string, ms: string): number {
  const millis = Number(ms.padEnd(3, '0').slice(0, 3));
  return Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + millis;
}

/** 毫秒 -> SRT 时间格式 HH:MM:SS,mmm */
export function formatTime(totalMs: number): string {
  const ms = Math.max(0, Math.round(totalMs));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mmm = ms % 1000;
  const pad = (v: number, len = 2) => String(v).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(mmm, 3)}`;
}

/**
 * 解析 SRT 文本。容错：BOM、CRLF、毫秒分隔符为点号、序号缺失。
 * 返回的条目按开始时间升序，原序号保留在 index 字段中。
 */
export function parseSrt(content: string): ParsedSrt {
  const warnings: string[] = [];
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const entries: SubEntry[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;
    const lines = block.split('\n');
    const timeLineIdx = lines.findIndex((l) => TIME_RE.test(l));
    if (timeLineIdx === -1) {
      warnings.push(`跳过无法解析的块：「${(lines[0] ?? '').trim().slice(0, 40)}」`);
      continue;
    }
    const idxLine = lines
      .slice(0, timeLineIdx)
      .map((l) => l.trim())
      .filter(Boolean)
      .pop();
    const index = idxLine && /^\d+$/.test(idxLine) ? Number(idxLine) : entries.length + 1;
    const match = lines[timeLineIdx].match(TIME_RE)!;
    const startMs = toMs(match[1], match[2], match[3], match[4]);
    const endMs = toMs(match[5], match[6], match[7], match[8]);
    const entryText = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .trim();
    if (endMs <= startMs) {
      warnings.push(`第 ${index} 条结束时间不大于开始时间`);
    }
    entries.push({ index, startMs, endMs, text: entryText });
  }

  entries.sort((x, y) => x.startMs - y.startMs || x.endMs - y.endMs);
  return { entries, warnings };
}

/** 序列化为 SRT 文本，序号从 1 重新编号 */
export function serializeSrt(entries: { startMs: number; endMs: number; text: string }[]): string {
  return (
    entries
      .map((e, i) => `${i + 1}\n${formatTime(e.startMs)} --> ${formatTime(e.endMs)}\n${e.text}`)
      .join('\n\n') + '\n'
  );
}
