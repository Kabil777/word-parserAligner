'use client';

import React, { useEffect, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, CloudUpload, FileText } from 'lucide-react';
import type { DocxEditorRef } from '@eigenpal/docx-editor-react';

export type { DocxEditorRef };

const DocxEditor = dynamic(
  () => import('@eigenpal/docx-editor-react').then((m) => m.DocxEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center h-full gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
        <span className="text-sm text-[var(--muted-foreground)]">Loading renderer…</span>
      </div>
    ),
  },
);

interface PreviewPanelProps {
  docxBlob: Blob | null;
  isLoading: boolean;
  hasSession: boolean;
}

export const PreviewPanel = forwardRef<DocxEditorRef, PreviewPanelProps>(
  function PreviewPanel({ docxBlob, isLoading, hasSession }, ref) {
    const [buffer,    setBuffer]    = useState<ArrayBuffer | null>(null);
    const [converting, setConverting] = useState(false);
    // Increment to force-remount DocxEditor when buffer changes
    const [docKey, setDocKey] = useState(0);

    useEffect(() => {
      if (!docxBlob) { setBuffer(null); return; }
      let cancelled = false;
      setConverting(true);
      docxBlob.arrayBuffer()
        .then((ab) => {
          if (!cancelled) {
            setBuffer(ab);
            setDocKey(k => k + 1); // force editor remount with new document
            setConverting(false);
          }
        })
        .catch(() => { if (!cancelled) setConverting(false); });
      return () => { cancelled = true; };
    }, [docxBlob]);

    const busy = isLoading || converting;

    if (!hasSession && !isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 opacity-50">
          <div className="w-20 h-20 rounded-3xl bg-[var(--muted)] flex items-center justify-center">
            <CloudUpload className="w-10 h-10 text-[var(--muted-foreground)]" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-[var(--foreground)]">No document loaded</p>
            <p className="text-sm text-[var(--muted-foreground)]">Upload a .docx file to start</p>
          </div>
          <div className="flex items-center gap-2 opacity-60">
            <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">.docx only</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex-1 flex flex-col h-full overflow-hidden">
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--background)]/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
              <p className="text-sm text-[var(--muted-foreground)] font-medium">
                {isLoading ? 'Uploading…' : 'Rendering…'}
              </p>
            </div>
          </div>
        )}

        {buffer && (
          <div className="flex-1 overflow-hidden docx-editor-wrap">
            {/* key={docKey} forces DocxEditor to fully remount on each new document */}
            <DocxEditor
              key={docKey}
              ref={ref}
              documentBuffer={buffer}
              mode="editing"
            />
          </div>
        )}

        <style>{`
          .docx-editor-wrap { display:flex; flex-direction:column; height:100%; }
          .docx-editor-wrap > * { flex:1; height:100%; }
        `}</style>
      </div>
    );
  }
);
