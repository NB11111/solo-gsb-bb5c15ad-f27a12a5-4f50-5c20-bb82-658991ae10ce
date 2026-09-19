import type { AlignGroup, Resolution, SubEntry, TextSource, TimeSource } from '../types';
import { formatTime } from '../lib/srt';
import { resolveEntries } from '../lib/merge';

const KIND_LABEL: Record<AlignGroup['kind'], string> = {
  '1:1': '一对一',
  '1:N': '一对多',
  'N:1': '多对一',
  'A-only': '仅 A',
  'B-only': '仅 B',
};

const KIND_CLASS: Record<AlignGroup['kind'], string> = {
  '1:1': 'kind-11',
  '1:N': 'kind-1n',
  'N:1': 'kind-n1',
  'A-only': 'kind-only',
  'B-only': 'kind-only',
};

function EntryView({ e }: { e: SubEntry }) {
  return (
    <div className="entry">
      <div className="entry-time">
        #{e.index} · {formatTime(e.startMs)} → {formatTime(e.endMs)}
      </div>
      <div className="entry-text">{e.text}</div>
    </div>
  );
}

interface GroupCardProps {
  group: AlignGroup;
  resolution: Resolution | undefined;
  onChange: (patch: Partial<Resolution>) => void;
}

export default function GroupCard({ group, resolution, onChange }: GroupCardProps) {
  const r: Resolution = resolution ?? {
    textFrom: 'A',
    timeFrom: 'union',
    resolved: !group.conflict,
  };
  const matched = group.a.length > 0 && group.b.length > 0;
  const pct = Math.round(group.confidence * 100);
  const confClass = group.confidence >= 0.8 ? 'high' : group.confidence >= 0.65 ? 'mid' : 'low';
  const preview = resolveEntries(group, r);

  return (
    <div className={`group-card ${group.conflict ? 'is-conflict' : ''} ${r.resolved ? 'is-resolved' : ''}`}>
      <div className="group-head">
        <span className="group-no">组 {group.id + 1}</span>
        <span className={`badge ${KIND_CLASS[group.kind]}`}>
          {group.kind} · {KIND_LABEL[group.kind]}
        </span>
        {matched ? (
          <span className={`conf conf-${confClass}`} title={`时间重叠 ${Math.round(group.timeOverlap * 100)}% · 文本相似 ${Math.round(group.textSim * 100)}%`}>
            置信度 {pct}%
            <span className="conf-bar">
              <span style={{ width: `${pct}%` }} />
            </span>
          </span>
        ) : (
          <span className="conf conf-only">单侧字幕，自动保留</span>
        )}
        {group.conflict &&
          (r.resolved ? <span className="tag ok">已确认</span> : <span className="tag warn">待处理</span>)}
      </div>

      <div className="columns">
        <div className="col">
          <div className="col-title">版本 A（{group.a.length} 条）</div>
          {group.a.length > 0 ? (
            group.a.map((e) => <EntryView key={e.index} e={e} />)
          ) : (
            <div className="empty">— 无对应字幕 —</div>
          )}
        </div>
        <div className="col">
          <div className="col-title">版本 B（{group.b.length} 条）</div>
          {group.b.length > 0 ? (
            group.b.map((e) => <EntryView key={e.index} e={e} />)
          ) : (
            <div className="empty">— 无对应字幕 —</div>
          )}
        </div>
      </div>

      {matched && (
        <div className="controls">
          <div className="control-row">
            <span className="control-label">保留文本</span>
            {(['A', 'B', 'both'] as TextSource[]).map((src) => (
              <label key={src} className={`pill ${r.textFrom === src ? 'active' : ''}`}>
                <input
                  type="radio"
                  name={`text-${group.id}`}
                  checked={r.textFrom === src}
                  onChange={() => onChange({ textFrom: src })}
                />
                {src === 'both' ? '两者都保留' : src}
              </label>
            ))}
          </div>
          <div className="control-row">
            <span className="control-label">时间轴</span>
            {(['A', 'B', 'union'] as TimeSource[]).map((src) => (
              <label
                key={src}
                className={`pill ${r.timeFrom === src ? 'active' : ''} ${r.textFrom === 'both' ? 'disabled' : ''}`}
              >
                <input
                  type="radio"
                  name={`time-${group.id}`}
                  disabled={r.textFrom === 'both'}
                  checked={r.timeFrom === src}
                  onChange={() => onChange({ timeFrom: src })}
                />
                {src === 'union' ? '并集' : src}
              </label>
            ))}
            {r.textFrom === 'both' && <span className="hint">「两者都保留」时各自使用原时间轴</span>}
          </div>
        </div>
      )}

      <div className="preview">
        <span className="preview-label">输出预览</span>
        {preview.map((p, i) => (
          <div key={i} className="preview-entry">
            <code>
              {formatTime(p.startMs)} → {formatTime(p.endMs)}
            </code>
            <span>{p.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
