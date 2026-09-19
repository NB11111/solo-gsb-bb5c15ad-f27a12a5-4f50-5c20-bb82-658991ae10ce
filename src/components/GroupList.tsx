import { useState } from 'react';
import type { AlignGroup, Resolution } from '../types';
import GroupCard from './GroupCard';

interface GroupListProps {
  groups: AlignGroup[];
  resolutions: Record<number, Resolution>;
  onChange: (id: number, patch: Partial<Resolution>) => void;
}

const PAGE = 100;

export default function GroupList({ groups, resolutions, onChange }: GroupListProps) {
  const [shown, setShown] = useState(PAGE);
  const visible = groups.slice(0, shown);

  return (
    <section className="group-list">
      {visible.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          resolution={resolutions[g.id]}
          onChange={(patch) => onChange(g.id, patch)}
        />
      ))}
      {groups.length === 0 && <p className="hint center">当前过滤条件下没有对齐组</p>}
      {shown < groups.length && (
        <button className="btn ghost wide" onClick={() => setShown((s) => s + PAGE)}>
          显示更多（还有 {groups.length - shown} 组）
        </button>
      )}
    </section>
  );
}
