/** 单条字幕 */
export interface SubEntry {
  /** 原文件中的序号（展示用） */
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export interface ParsedSrt {
  entries: SubEntry[];
  warnings: string[];
}

/** 已导入并解析完成的一份字幕文件 */
export interface LoadedFile {
  name: string;
  parsed: ParsedSrt;
}

/** 对齐组类型：一对一 / 一对多 / 多对一 / 仅存在于 A / 仅存在于 B */
export type GroupKind = '1:1' | '1:N' | 'N:1' | 'A-only' | 'B-only';

export interface AlignGroup {
  id: number;
  kind: GroupKind;
  /** 该组中来自版本 A 的字幕（按顺序） */
  a: SubEntry[];
  /** 该组中来自版本 B 的字幕（按顺序） */
  b: SubEntry[];
  /** 综合置信度 0..1（时间重叠 + 文本相似度加权） */
  confidence: number;
  /** 时间区间交并比 0..1 */
  timeOverlap: number;
  /** 文本相似度 0..1 */
  textSim: number;
  /** 低置信度、需人工确认 */
  conflict: boolean;
}

/** 文本保留来源：A / B / 两者都保留 */
export type TextSource = 'A' | 'B' | 'both';
/** 时间轴来源：A / B / 两者并集 */
export type TimeSource = 'A' | 'B' | 'union';

export interface Resolution {
  textFrom: TextSource;
  timeFrom: TimeSource;
  /** 是否已（自动或人工）确认 */
  resolved: boolean;
}

export interface MergedEntry {
  groupId: number;
  startMs: number;
  endMs: number;
  text: string;
}
