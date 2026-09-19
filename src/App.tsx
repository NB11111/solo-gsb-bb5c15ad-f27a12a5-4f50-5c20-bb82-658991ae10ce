import { useEffect, useMemo, useState } from 'react';
import type { AlignGroup, LoadedFile, Resolution } from './types';
import { parseSrt, serializeSrt } from './lib/srt';
import { alignSubtitles } from './lib/align';
import { autoFixEntries, buildMergedEntries, defaultResolution, validateMerged } from './lib/merge';
import ImportPanel from './components/ImportPanel';
import StatsBar from './components/StatsBar';
import GroupList from './components/GroupList';
import ExportPanel from './components/ExportPanel';
import { DEMO_A, DEMO_B } from './demo';

export default function App() {
  const [fileA, setFileA] = useState<LoadedFile | null>(null);
  const [fileB, setFileB] = useState<LoadedFile | null>(null);
  const [resolutions, setResolutions] = useState<Record<number, Resolution>>({});
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [fixed, setFixed] = useState(false);

  const alignResult = useMemo(() => {
    if (!fileA || !fileB) return { groups: [] as AlignGroup[], error: null as string | null };
    try {
      return { groups: alignSubtitles(fileA.parsed.entries, fileB.parsed.entries), error: null as string | null };
    } catch (e) {
      return { groups: [] as AlignGroup[], error: e instanceof Error ? e.message : String(e) };
    }
  }, [fileA, fileB]);

  const groups = alignResult.groups;

  // 对齐结果变化时重建取舍方案：高置信度自动确认，冲突组待人工处理
  useEffect(() => {
    const init: Record<number, Resolution> = {};
    for (const g of groups) init[g.id] = defaultResolution(g);
    setResolutions(init);
    setFixed(false);
  }, [groups]);

  const merged = useMemo(() => buildMergedEntries(groups, resolutions), [groups, resolutions]);
  const exportEntries = useMemo(() => (fixed ? autoFixEntries(merged) : merged), [fixed, merged]);
  const issues = useMemo(() => validateMerged(exportEntries), [exportEntries]);
  const errors = issues.filter((i) => i.level === 'error');
  const unresolved = groups.filter((g) => g.conflict && !resolutions[g.id]?.resolved).length;
  const canExport = groups.length > 0 && unresolved === 0 && errors.length === 0;

  const updateResolution = (id: number, patch: Partial<Resolution>) => {
    setResolutions((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, resolved: true } }));
    setFixed(false);
  };

  const confirmAll = () => {
    setResolutions((prev) => {
      const next: Record<number, Resolution> = {};
      for (const [k, v] of Object.entries(prev)) next[Number(k)] = { ...v, resolved: true };
      return next;
    });
  };

  const resetAll = () => {
    const init: Record<number, Resolution> = {};
    for (const g of groups) init[g.id] = defaultResolution(g);
    setResolutions(init);
    setFixed(false);
  };

  const download = () => {
    if (!canExport) return;
    const srt = serializeSrt(exportEntries);
    const blob = new Blob(['\uFEFF' + srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.srt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadDemo = () => {
    setFileA({ name: 'demo-A.srt', parsed: parseSrt(DEMO_A) });
    setFileB({ name: 'demo-B.srt', parsed: parseSrt(DEMO_B) });
  };

  const preview = useMemo(() => {
    const head = serializeSrt(exportEntries.slice(0, 8));
    return exportEntries.length > 8 ? `${head}\n…（共 ${exportEntries.length} 条）` : head;
  }, [exportEntries]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>双版本字幕对齐合并工具</h1>
        <p>
          导入两份 SRT，按时间重叠与文本相似度顺序对齐（支持一对一 / 一对多 / 多对一），
          人工确认冲突后导出合并结果。全部计算在浏览器本地完成。
        </p>
      </header>

      <main>
        <ImportPanel
          fileA={fileA}
          fileB={fileB}
          onLoadA={setFileA}
          onLoadB={setFileB}
          onClearA={() => setFileA(null)}
          onClearB={() => setFileB(null)}
          onDemo={loadDemo}
        />

        {alignResult.error && <div className="alert-error">对齐失败：{alignResult.error}</div>}

        {groups.length > 0 && (
          <>
            <StatsBar groups={groups} unresolved={unresolved} />

            <div className="toolbar">
              <h2 className="toolbar-title">2. 确认对齐组</h2>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={conflictsOnly}
                  onChange={(e) => setConflictsOnly(e.target.checked)}
                />
                仅显示冲突组
              </label>
              <button className="btn" onClick={confirmAll}>
                全部按当前选择确认
              </button>
              <button className="btn ghost" onClick={resetAll}>
                重置为默认选择
              </button>
            </div>

            <GroupList
              groups={conflictsOnly ? groups.filter((g) => g.conflict) : groups}
              resolutions={resolutions}
              onChange={updateResolution}
            />

            <ExportPanel
              entryCount={exportEntries.length}
              unresolved={unresolved}
              issues={issues}
              fixed={fixed}
              canExport={canExport}
              onAutoFix={() => setFixed(true)}
              onDownload={download}
              preview={preview}
            />
          </>
        )}
      </main>

      <footer className="app-footer">纯前端应用 · 字幕文件不会上传到任何服务器</footer>
    </div>
  );
}
