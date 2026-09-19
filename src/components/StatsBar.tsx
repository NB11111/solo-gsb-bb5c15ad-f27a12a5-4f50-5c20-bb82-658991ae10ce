import type { AlignGroup } from '../types';

interface StatsBarProps {
  groups: AlignGroup[];
  unresolved: number;
}

export default function StatsBar({ groups, unresolved }: StatsBarProps) {
  const count = (pred: (g: AlignGroup) => boolean) => groups.filter(pred).length;
  const matched = groups.filter((g) => g.a.length > 0 && g.b.length > 0);
  const avg = matched.length ? matched.reduce((s, g) => s + g.confidence, 0) / matched.length : 0;

  const stats = [
    { label: '对齐组数', value: groups.length },
    { label: '一对一', value: count((g) => g.kind === '1:1') },
    { label: '一对多', value: count((g) => g.kind === '1:N') },
    { label: '多对一', value: count((g) => g.kind === 'N:1') },
    { label: '单侧字幕', value: count((g) => g.kind === 'A-only' || g.kind === 'B-only') },
    { label: '平均置信度', value: `${Math.round(avg * 100)}%` },
    { label: '待处理冲突', value: unresolved, alert: unresolved > 0 },
  ];

  return (
    <section className="stats">
      {stats.map((s) => (
        <div key={s.label} className={`stat ${s.alert ? 'alert' : ''}`}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </section>
  );
}
