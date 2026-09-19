import type { ValidationIssue } from '../lib/merge';

interface ExportPanelProps {
  entryCount: number;
  unresolved: number;
  issues: ValidationIssue[];
  fixed: boolean;
  canExport: boolean;
  onAutoFix: () => void;
  onDownload: () => void;
  preview: string;
}

export default function ExportPanel({
  entryCount,
  unresolved,
  issues,
  fixed,
  canExport,
  onAutoFix,
  onDownload,
  preview,
}: ExportPanelProps) {
  const errors = issues.filter((i) => i.level === 'error');

  return (
    <section className="panel export-panel">
      <h2>3. 校验并导出</h2>
      <ul className="check-list">
        <li className={unresolved === 0 ? 'ok' : 'bad'}>
          {unresolved === 0 ? '✓' : '✗'} 冲突处理：
          {unresolved === 0 ? '全部冲突已确认' : `还有 ${unresolved} 个冲突未处理`}
        </li>
        <li className={errors.length === 0 ? 'ok' : 'bad'}>
          {errors.length === 0 ? '✓' : '✗'} 时间轴校验：
          {errors.length === 0
            ? `单调性检查通过，共 ${entryCount} 条，导出时从 1 重新编号`
            : `发现 ${errors.length} 个时间问题`}
        </li>
      </ul>

      {errors.length > 0 && (
        <div className="issues">
          {issues.slice(0, 10).map((issue, idx) => (
            <div key={idx} className={`issue ${issue.level}`}>
              {issue.message}
            </div>
          ))}
          {issues.length > 10 && <div className="issue">… 共 {issues.length} 条</div>}
          {!fixed && (
            <button className="btn" onClick={onAutoFix}>
              自动修复时间轴（裁剪重叠，保证单调递增）
            </button>
          )}
        </div>
      )}

      <div className="export-actions">
        <button className="btn primary" disabled={!canExport} onClick={onDownload}>
          下载 merged.srt
        </button>
        {!canExport && <span className="hint">需处理完全部冲突且时间轴校验通过后才能导出</span>}
      </div>

      <details className="preview-box">
        <summary>预览合并结果（前 8 条）</summary>
        <pre>{preview}</pre>
      </details>
    </section>
  );
}
