'use client';

import React, { useState } from 'react';
import { useDocumentAligner } from '../../hooks/useDocumentAligner';
import { DocxDropzone } from '../../components/feature/DocxDropzone';
import { StylesPanel } from '../../components/feature/StylesPanel';
import { PreviewPanel } from '../../components/feature/PreviewPanel';
import { AIStructurePanel } from '../../components/feature/AIStructurePanel';
import {
  Download, FileText, Loader2, Sparkles, Zap,
  PanelLeftClose, PanelLeftOpen, Wand2, CheckCircle2, X,
} from 'lucide-react';

export default function WorkspacePage() {
  const {
    editorRef,
    hasSession,
    originalName,
    documentStyles,
    stylesConfig,
    detectedGroups,
    groupConfig,
    docxBlob,
    isUploading,
    isApplying,
    isAnalyzing,
    isExporting,
    error,
    analysisError,
    userInstructions,
    setUserInstructions,
    handleUpload,
    handleStyleChange,
    handleGroupStyleChange,
    handleAnalyze,
    handleExport,
  } = useDocumentAligner();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const aiApplied = detectedGroups.length > 0;

  return (
    // No overflow-hidden here — let fixed elements render freely
    <div className="flex flex-col h-screen bg-[var(--background)]">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] bg-[var(--card)] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all"
          >
            {sidebarOpen
              ? <PanelLeftClose className="w-4 h-4" />
              : <PanelLeftOpen  className="w-4 h-4" />
            }
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--primary)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary-foreground)]" />
            </div>
            <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">DocX Aligner</span>
          </div>

          {hasSession && (
            <>
              <span className="text-[var(--border)] select-none">·</span>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span className="max-w-[180px] truncate text-sm font-medium text-[var(--foreground)]">{originalName}</span>
              </div>
              {isApplying || isAnalyzing ? (
                <span className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isAnalyzing ? 'AI aligning…' : 'Rendering…'}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <Zap className="w-3 h-3" /> Live
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400 max-w-[200px] truncate">{error}</span>}
          {hasSession && (
            <button
              onClick={handleExport}
              disabled={isExporting || isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-[var(--primary)] text-[var(--primary-foreground)]
                hover:opacity-90 active:scale-95 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
                : <><Download className="w-3.5 h-3.5" /> Export .docx</>
              }
            </button>
          )}
        </div>
      </header>

      {/* ── Body (clip only this section) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Collapsible sidebar ── */}
        <aside
          className="shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--card)] overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: sidebarOpen ? '272px' : '0px' }}
        >
          {/* fixed-width inner so content doesn't squish during animation */}
          <div className="w-[272px] flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                Document Styles
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all"
                title="Close sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <StylesPanel
                documentStyles={documentStyles}
                stylesConfig={stylesConfig}
                onStyleChange={handleStyleChange}
                disabled={!hasSession || isUploading}
                embedded
              />
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!hasSession ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 gap-8">
              <div className="text-center space-y-2 max-w-md">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  Align your document styles
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Upload a <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs font-mono">.docx</code> file.
                  Adjust styles in the sidebar — or let AI restructure everything automatically.
                </p>
              </div>
              <DocxDropzone onFileAccepted={handleUpload} isUploading={isUploading} error={error} />
              <div className="flex flex-wrap gap-2 justify-center">
                {['Live preview', 'AI auto-alignment', 'Per-style control', 'Export .docx'].map(f => (
                  <span key={f} className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted-foreground)]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--border)] bg-[var(--card)]/50 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Preview
                </span>
                {isApplying && (
                  <span className="text-xs text-[var(--primary)] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Applying…
                  </span>
                )}
              </div>
              <PreviewPanel
                ref={editorRef}
                docxBlob={docxBlob}
                isLoading={isUploading}
                hasSession={hasSession}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── AI slide-up panel — fixed so it's never clipped ── */}
      {aiPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAiPanelOpen(false)}
          />
          {/* Panel — fixed to bottom-right, clear of FAB */}
          <div
            className="fixed bottom-16 right-4 z-50 w-80 max-h-[70vh] flex flex-col
              bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl
              overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span className="font-semibold text-sm text-[var(--foreground)]">Auto-Align</span>
              </div>
              <div className="flex items-center gap-2">
                {aiApplied && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--primary)] font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Applied
                  </span>
                )}
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <AIStructurePanel
                hasSession={hasSession}
                detectedGroups={detectedGroups}
                groupConfig={groupConfig}
                onGroupStyleChange={handleGroupStyleChange}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                analysisError={analysisError}
                userInstructions={userInstructions}
                onUserInstructionsChange={setUserInstructions}
              />
            </div>
          </div>
        </>
      )}

      {/* ── FAB — fixed, no relative, isolated span for ping ── */}
      {hasSession && (
        <button
          onClick={() => setAiPanelOpen(p => !p)}
          title="Auto-Align document"
          style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 50 }}
          className="w-11 h-11 rounded-full shadow-md flex items-center justify-center
            bg-[var(--primary)] text-[var(--primary-foreground)]
            hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          {isAnalyzing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Wand2 className="w-4 h-4" />
          }
        </button>
      )}
    </div>
  );
}
