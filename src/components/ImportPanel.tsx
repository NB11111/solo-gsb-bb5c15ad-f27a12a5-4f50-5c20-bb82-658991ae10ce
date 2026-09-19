import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { LoadedFile } from '../types';
import { parseSrt } from '../lib/srt';

interface FileCardProps {
  label: string;
  file: LoadedFile | null;
  onLoad: (f: LoadedFile) => void;
  onClear: () => void;
}

function FileCard({ label, file, onLoad, onClear }: FileCardProps) {
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    onLoad({ name: f.name, parsed: parseSrt(text) });
    e.target.value = '';
  };

  const handlePaste = () => {
    if (!paste.trim()) return;
    onLoad({ name: `${label}（粘贴）`, parsed: parseSrt(paste) });
    setPaste('');
    setShowPaste(false);
  };

  return (
    <div className="file-card">
      <div className="file-card-header">
        <span className="file-label">{label}</span>
        {file && (
          <button className="link-btn" onClick={onClear}>
            移除
          </button>
        )}
      </div>
      {file ? (
        <div className="file-info">
          <div className="file-name">📄 {file.name}</div>
          <div className="file-meta">{file.parsed.entries.length} 条字幕</div>
          {file.parsed.warnings.length > 0 && (
            <div className="file-warnings">
              ⚠ {file.parsed.warnings.length} 条解析警告
              <ul>
                {file.parsed.warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {file.parsed.warnings.length > 3 && <li>…</li>}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          <label className="drop-zone">
            <input type="file" accept=".srt,.txt,text/plain" onChange={handleFile} hidden />
            <span className="drop-icon">⬆</span>
            <span>点击选择 SRT 文件</span>
          </label>
          <button className="link-btn" onClick={() => setShowPaste((v) => !v)}>
            {showPaste ? '收起粘贴区' : '或粘贴文本'}
          </button>
          {showPaste && (
            <div className="paste-area">
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={'1\n00:00:01,000 --> 00:00:02,000\n字幕文本…'}
                rows={5}
              />
              <button className="btn small" onClick={handlePaste} disabled={!paste.trim()}>
                解析文本
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ImportPanelProps {
  fileA: LoadedFile | null;
  fileB: LoadedFile | null;
  onLoadA: (f: LoadedFile) => void;
  onLoadB: (f: LoadedFile) => void;
  onClearA: () => void;
  onClearB: () => void;
  onDemo: () => void;
}

export default function ImportPanel({ fileA, fileB, onLoadA, onLoadB, onClearA, onClearB, onDemo }: ImportPanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>1. 导入两份字幕</h2>
        <button className="btn ghost" onClick={onDemo}>
          载入示例数据
        </button>
      </div>
      <div className="grid-2">
        <FileCard label="版本 A" file={fileA} onLoad={onLoadA} onClear={onClearA} />
        <FileCard label="版本 B" file={fileB} onLoad={onLoadB} onClear={onClearB} />
      </div>
      {(!fileA || !fileB) && <p className="hint center">两份字幕都导入后会自动开始对齐</p>}
    </section>
  );
}
