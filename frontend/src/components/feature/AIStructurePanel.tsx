'use client';

import React, { useState } from 'react';
import { Wand2, Key, Loader2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, MoveVertical, Type } from 'lucide-react';
import type { DetectedStyleGroup, StyleSpec, StylesConfig, SemanticType } from '../../types/document.types';

// ── Shared align options ──────────────────────────────────────────────────────

const ALIGN_OPTS: { value: StyleSpec['alignment']; icon: React.ReactNode; label: string }[] = [
  { value: 'left',    icon: <AlignLeft    className="w-3.5 h-3.5" />, label: 'Left' },
  { value: 'center',  icon: <AlignCenter  className="w-3.5 h-3.5" />, label: 'Center' },
  { value: 'right',   icon: <AlignRight   className="w-3.5 h-3.5" />, label: 'Right' },
  { value: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Justify' },
];

const TYPE_LABELS: Record<SemanticType, string> = {
  heading1: 'H1', heading2: 'H2', heading3: 'H3',
  body: 'Body', caption: 'Cap', other: 'Other',
};

// ── Small reusable number input ───────────────────────────────────────────────

function NumInput({ label, value, onChange, min = 0, max = 200, step = 1 }: {
  label: string; value?: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground truncate flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" value={value ?? ''} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 text-right text-xs px-2 py-1 rounded bg-secondary border border-border
            text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />
        <span className="text-xs text-muted-foreground w-4">pt</span>
      </div>
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({ group, config, onChange }: {
  group: DetectedStyleGroup;
  config: StyleSpec;
  onChange: (patch: Partial<StyleSpec>) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = TYPE_LABELS[group.semanticType] ?? group.semanticType;

  return (
    <div className={`rounded-lg border transition-colors ${open ? 'border-border bg-card' : 'border-border/60 bg-secondary/30'}`}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 transition-colors rounded-lg"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Type badge — uses primary color, same as the rest of the app */}
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
            {label}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{group.label}</p>
            {group.sampleText && (
              <p className="text-[10px] text-muted-foreground truncate italic">
                "{group.sampleText.slice(0, 36)}"
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">{group.paragraphIndices.length}¶</span>
          {open
            ? <ChevronDown  className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border">

          {/* Alignment */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alignment</label>
            <div className="flex gap-1">
              {ALIGN_OPTS.map(opt => (
                <button key={opt.value} title={opt.label}
                  onClick={() => onChange({ alignment: opt.value })}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded border text-xs transition-all
                    ${config.alignment === opt.value
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Font size + Bold row */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Type className="w-3 h-3" /> Size
              </label>
              <div className="flex items-center gap-1">
                <input type="number" value={config.fontSize ?? ''} min={6} max={144} step={0.5}
                  placeholder="—"
                  onChange={e => onChange({ fontSize: parseFloat(e.target.value) || undefined })}
                  className="w-full text-xs px-2 py-1.5 rounded bg-secondary border border-border
                    text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
                <span className="text-xs text-muted-foreground shrink-0">pt</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Bold className="w-3 h-3" /> Bold
              </label>
              <button onClick={() => onChange({ bold: !config.bold })}
                className={`w-full px-3 py-1.5 rounded border text-xs font-semibold transition-all
                  ${config.bold
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
              >
                {config.bold ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Spacing */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MoveVertical className="w-3 h-3" /> Spacing
            </label>
            <div className="space-y-1">
              <NumInput label="Before"  value={config.spacingBefore} onChange={v => onChange({ spacingBefore: v })} />
              <NumInput label="After"   value={config.spacingAfter}  onChange={v => onChange({ spacingAfter: v })} />
              <NumInput label="Line ×"  value={config.lineSpacing}   onChange={v => onChange({ lineSpacing: v })} min={0.5} max={5} step={0.05} />
            </div>
          </div>

          {/* Indent */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Indent</label>
            <div className="space-y-1">
              <NumInput label="Left"       value={config.indent}          onChange={v => onChange({ indent: v })} />
              <NumInput label="First line" value={config.firstLineIndent} onChange={v => onChange({ firstLineIndent: v })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── API Key Dialog ────────────────────────────────────────────────────────────

function ApiKeyDialog({ onSubmit, onCancel, isLoading, error }: {
  onSubmit: (key: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [key, setKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('nvidia_api_key') ?? '';
    return '';
  });

  const submit = () => {
    if (!key.trim()) return;
    localStorage.setItem('nvidia_api_key', key.trim());
    onSubmit(key.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">NVIDIA API Key</p>
            <p className="text-xs text-muted-foreground">Required for AI alignment</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <a href="https://integrate.api.nvidia.com" target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline">
            Get key at integrate.api.nvidia.com →
          </a>
          <input
            type="password" value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="nvapi-xxxxxxxxxxxx"
            className="w-full text-xs px-3 py-2 rounded-lg bg-secondary border border-border font-mono
              text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={!key.trim() || isLoading}
            className="flex-1 py-2 rounded-lg text-xs bg-primary text-primary-foreground font-semibold
              hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {isLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
              : <><Wand2 className="w-3.5 h-3.5" /> Align</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface AIPanelProps {
  hasSession: boolean;
  detectedGroups: DetectedStyleGroup[];
  groupConfig: StylesConfig;
  onGroupStyleChange: (groupId: string, patch: Partial<StyleSpec>) => void;
  onAnalyze: (apiKey: string) => void;
  isAnalyzing: boolean;
  analysisError: string | null;
}

export function AIStructurePanel({
  hasSession, detectedGroups, groupConfig,
  onGroupStyleChange, onAnalyze, isAnalyzing, analysisError,
}: AIPanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const done = detectedGroups.length > 0;

  const trigger = () => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nvidia_api_key') : null;
    if (saved) { onAnalyze(saved); } else { setShowDialog(true); }
  };

  return (
    <>
      {showDialog && (
        <ApiKeyDialog
          onSubmit={key => { setShowDialog(false); onAnalyze(key); }}
          onCancel={() => setShowDialog(false)}
          isLoading={isAnalyzing}
          error={analysisError}
        />
      )}

      <div className="space-y-3">

        {/* Primary action button — uses app primary color */}
        <button
          onClick={trigger}
          disabled={!hasSession || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold
            bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]
            transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAnalyzing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aligning document…</>
            : done
              ? <><Wand2 className="w-3.5 h-3.5" /> Re-run alignment</>
              : <><Wand2 className="w-3.5 h-3.5" /> Auto-Align document</>
          }
        </button>

        {/* Helper text */}
        {!done && !isAnalyzing && (
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Detects headings, body and captions — applies default alignment rules automatically.
          </p>
        )}

        {/* Error */}
        {analysisError && !showDialog && (
          <div className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{analysisError}
              <button onClick={() => setShowDialog(true)} className="underline ml-1">retry</button>
            </span>
          </div>
        )}

        {/* Applied groups */}
        {done && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
              <span className="font-medium">Applied — expand to fine-tune</span>
            </div>
            <div className="space-y-1.5">
              {detectedGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  config={groupConfig[group.id] ?? group.recommendedStyle}
                  onChange={patch => onGroupStyleChange(group.id, patch)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
