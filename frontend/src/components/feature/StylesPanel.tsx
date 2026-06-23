'use client';

import React, { useState } from 'react';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, ChevronDown, ChevronRight, Type, MoveVertical,
} from 'lucide-react';
import type { DocumentStyleInfo, StyleSpec, StylesConfig } from '../../types/document.types';

interface StylesPanelProps {
  documentStyles: DocumentStyleInfo[];
  stylesConfig: StylesConfig;
  onStyleChange: (styleId: string, patch: Partial<StyleSpec>) => void;
  disabled?: boolean;
  embedded?: boolean; // renders without its own aside shell
}

const ALIGN_OPTS: { value: StyleSpec['alignment']; icon: React.ReactNode; label: string }[] = [
  { value: 'left',    icon: <AlignLeft    className="w-3.5 h-3.5" />, label: 'Left' },
  { value: 'center',  icon: <AlignCenter  className="w-3.5 h-3.5" />, label: 'Center' },
  { value: 'right',   icon: <AlignRight   className="w-3.5 h-3.5" />, label: 'Right' },
  { value: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Justify' },
];

function headingLabel(lvl?: number) {
  if (lvl === undefined) return null;
  return `H${lvl + 1}`;
}

function headingBadgeColor(lvl?: number) {
  const colors = [
    'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'bg-sky-500/20 text-sky-300 border-sky-500/30',
  ];
  return colors[Math.min(lvl ?? 0, colors.length - 1)];
}

function NumInput({ label, value, onChange, min = 0, max = 200, step = 1 }: {
  label: string; value?: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--muted-foreground)] truncate flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 text-right text-xs px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)]
            text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
        />
        <span className="text-xs text-[var(--muted-foreground)] w-4">pt</span>
      </div>
    </div>
  );
}

function StyleCard({
  style, config, onChange, disabled,
}: {
  style: DocumentStyleInfo;
  config: StyleSpec;
  onChange: (patch: Partial<StyleSpec>) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isHeading = style.type === 'heading';
  const badgeLabel = headingLabel(style.outlineLvl);
  const badgeColor = headingBadgeColor(style.outlineLvl);
  const displayName = style.name.replace(/^w:/, '');

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden
      ${open ? 'border-[var(--primary)]/40 bg-[var(--card)]' : 'border-[var(--border)] bg-[var(--card)]/60'}
      ${disabled ? 'opacity-40 pointer-events-none' : ''}
    `}>
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left group"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {badgeLabel && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
              {badgeLabel}
            </span>
          )}
          <span className="text-sm font-medium text-[var(--foreground)] truncate capitalize">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--muted-foreground)] opacity-70">
            {config.alignment ?? 'left'} · {config.fontSize ?? '—'}pt
          </span>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            : <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          }
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">

          {/* Alignment */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Alignment
            </label>
            <div className="flex gap-1">
              {ALIGN_OPTS.map(opt => (
                <button
                  key={opt.value}
                  title={opt.label}
                  onClick={() => onChange({ alignment: opt.value })}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border text-xs transition-all
                    ${config.alignment === opt.value
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]'
                    }`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Font size + Bold row */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">
                Font Size
              </label>
              <div className="flex items-center gap-1">
                <Type className="w-3 h-3 text-[var(--muted-foreground)]" />
                <input
                  type="number"
                  value={config.fontSize ?? ''}
                  min={6} max={144} step={0.5}
                  onChange={e => onChange({ fontSize: parseFloat(e.target.value) || undefined })}
                  placeholder="—"
                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)]
                    text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <span className="text-xs text-[var(--muted-foreground)]">pt</span>
              </div>
            </div>

            <div className="shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">
                Bold
              </label>
              <button
                onClick={() => onChange({ bold: !config.bold })}
                className={`p-2 rounded-lg border transition-all
                  ${config.bold
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50'
                  }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Spacing */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1">
              <MoveVertical className="w-3 h-3" /> Spacing
            </label>
            <div className="space-y-1.5">
              <NumInput label="Before"       value={config.spacingBefore} onChange={v => onChange({ spacingBefore: v })} />
              <NumInput label="After"        value={config.spacingAfter}  onChange={v => onChange({ spacingAfter: v })} />
              <NumInput label="Line spacing" value={config.lineSpacing}   onChange={v => onChange({ lineSpacing: v })}
                min={0.5} max={5} step={0.05}
              />
            </div>
          </div>

          {/* Indent */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Indent
            </label>
            <div className="space-y-1.5">
              <NumInput label="Left indent" value={config.indent}          onChange={v => onChange({ indent: v })} />
              <NumInput label="First line"  value={config.firstLineIndent} onChange={v => onChange({ firstLineIndent: v })} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export function StylesPanel({ documentStyles, stylesConfig, onStyleChange, disabled, embedded }: StylesPanelProps) {
  const headings = documentStyles.filter(s => s.type === 'heading');
  const others   = documentStyles.filter(s => s.type !== 'heading');

  const renderGroup = (label: string, items: DocumentStyleInfo[], accent: string) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 px-1`}>
          <div className={`h-px flex-1 ${accent}`} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
          <div className={`h-px flex-1 ${accent}`} />
        </div>
        <div className="space-y-1.5">
          {items.map(style => (
            <StyleCard
              key={style.id}
              style={style}
              config={stylesConfig[style.id] ?? {}}
              onChange={patch => onStyleChange(style.id, patch)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  };

  const content = (
    <div className="space-y-4">
      {!disabled && documentStyles.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] text-center py-4 opacity-60">
          No styles detected
        </p>
      )}
      {renderGroup('Headings', headings, 'bg-violet-500/20')}
      {renderGroup('Body & Other', others, 'bg-emerald-500/20')}
    </div>
  );

  if (embedded) return content;

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full border-r border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          Document Styles
        </h2>
        {disabled && (
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 opacity-60">Upload a file to start</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {content}
      </div>
    </aside>
  );
}
