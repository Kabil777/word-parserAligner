'use client';

import { useState, useCallback, useRef } from 'react';
import type { DocxEditorRef } from '../components/feature/PreviewPanel';
import type { DocumentStyleInfo, StyleSpec, StylesConfig, DetectedStyleGroup } from '../types/document.types';
import { documentService } from '../services/api/documentService';
import { applyAllStylesToDocx } from '../utils/docxStyler';

function buildInitialConfig(docStyles: DocumentStyleInfo[]): StylesConfig {
  const config: StylesConfig = {};
  for (const s of docStyles) {
    config[s.id] = {
      alignment: s.alignment,
      fontSize: s.fontSize,
      bold: s.bold,
      spacingBefore: s.spacingBefore,
      spacingAfter: s.spacingAfter,
      lineSpacing: s.lineSpacing,
      indent: s.indent,
      firstLineIndent: s.firstLineIndent,
    };
  }
  return config;
}

export function useDocumentAligner() {
  const editorRef = useRef<DocxEditorRef>(null);

  const originalFileRef  = useRef<File | null>(null);
  const stylesConfigRef  = useRef<StylesConfig>({});
  const groupConfigRef   = useRef<StylesConfig>({});
  const applyTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef     = useRef<string>('');

  const [previewBlob,    setPreviewBlob]    = useState<Blob | null>(null);
  const [documentStyles, setDocumentStyles] = useState<DocumentStyleInfo[]>([]);
  const [stylesConfig,   setStylesConfig]   = useState<StylesConfig>({});
  const [detectedGroups, setDetectedGroups] = useState<DetectedStyleGroup[]>([]);
  const [groupConfig,    setGroupConfig]    = useState<StylesConfig>({});
  const [originalName,   setOriginalName]   = useState('');
  const [hasSession,     setHasSession]     = useState(false);
  const [isUploading,    setIsUploading]    = useState(false);
  const [isApplying,     setIsApplying]     = useState(false);
  const [isAnalyzing,    setIsAnalyzing]    = useState(false);
  const [isExporting,    setIsExporting]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [analysisError,  setAnalysisError]  = useState<string | null>(null);

  // ── Core apply ───────────────────────────────────────────────────────────────
  const applyWithConfig = useCallback(async (
    wordCfg: StylesConfig,
    grpCfg: StylesConfig,
    groups: DetectedStyleGroup[],
  ) => {
    const file = originalFileRef.current;
    if (!file) return;
    setIsApplying(true);
    setError(null);
    try {
      const newBlob = await applyAllStylesToDocx(file, wordCfg, groups, grpCfg);
      setPreviewBlob(newBlob);
    } catch (err) {
      console.error('[apply]', err);
      setError(err instanceof Error ? err.message : 'Failed to apply styles.');
    } finally {
      setIsApplying(false);
    }
  }, []);

  // ── Debounced schedule ───────────────────────────────────────────────────────
  const scheduleApply = useCallback(() => {
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      applyWithConfig(stylesConfigRef.current, groupConfigRef.current, detectedGroups);
    }, 600);
  }, [applyWithConfig, detectedGroups]);

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setPreviewBlob(null);
    setDetectedGroups([]);
    setGroupConfig({});
    try {
      const data = await documentService.upload(file);
      const initConfig = buildInitialConfig(data.documentStyles);
      originalFileRef.current = file;
      stylesConfigRef.current = initConfig;
      groupConfigRef.current  = {};
      sessionIdRef.current    = data.sessionId;
      setOriginalName(data.originalName);
      setDocumentStyles(data.documentStyles);
      setStylesConfig(initConfig);
      setHasSession(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ── Ensure session is alive — re-upload if backend restarted ────────────────
  const refreshSession = useCallback(async (): Promise<string> => {
    const file = originalFileRef.current;
    if (!file) throw new Error('No document loaded. Please upload again.');
    const data = await documentService.upload(file);
    sessionIdRef.current = data.sessionId;
    return data.sessionId;
  }, []);

  // ── AI Structure Analysis ────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async (apiKey: string) => {
    if (!originalFileRef.current) { setAnalysisError('Upload a document first.'); return; }
    setIsAnalyzing(true);
    setAnalysisError(null);

    const run = async (sessionId: string) => {
      const groups = await documentService.analyzeStructure(sessionId, apiKey);
      setDetectedGroups(groups);

      // Auto-populate groupConfig from AI's recommendedStyle — instant restructure
      const autoConfig: StylesConfig = {};
      groups.forEach(g => { autoConfig[g.id] = { ...g.recommendedStyle }; });
      groupConfigRef.current = autoConfig;
      setGroupConfig(autoConfig);

      // Immediately apply the AI-recommended styles to the document
      await applyWithConfig(stylesConfigRef.current, autoConfig, groups);
    };

    try {
      await run(sessionIdRef.current);
    } catch (err: any) {
      // 404 = session expired (backend restarted) — re-upload silently and retry
      if (err?.response?.status === 404 || err?.response?.data?.error?.includes('Session')) {
        try {
          const freshId = await refreshSession();
          await run(freshId);
        } catch (retryErr) {
          setAnalysisError(retryErr instanceof Error ? retryErr.message : 'Analysis failed.');
        }
      } else {
        setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Check your API key.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [refreshSession]);

  // ── Word style change ────────────────────────────────────────────────────────
  const handleStyleChange = useCallback((styleId: string, patch: Partial<StyleSpec>) => {
    setStylesConfig(prev => {
      const next = { ...prev, [styleId]: { ...prev[styleId], ...patch } };
      stylesConfigRef.current = next;
      return next;
    });
    scheduleApply();
  }, [scheduleApply]);

  // ── Detected group style change ──────────────────────────────────────────────
  const handleGroupStyleChange = useCallback((groupId: string, patch: Partial<StyleSpec>) => {
    setGroupConfig(prev => {
      const next = { ...prev, [groupId]: { ...prev[groupId], ...patch } };
      groupConfigRef.current = next;
      return next;
    });
    scheduleApply();
  }, [scheduleApply]);

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const blob = previewBlob ?? originalFileRef.current;
    if (!blob) { setError('No document to export.'); return; }
    setIsExporting(true);
    try {
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), {
        href: url, download: originalName || 'aligned.docx',
      }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [previewBlob, originalName]);

  return {
    editorRef,
    hasSession,
    originalName,
    documentStyles,
    stylesConfig,
    detectedGroups,
    groupConfig,
    docxBlob: previewBlob ?? (originalFileRef.current as Blob | null),
    isUploading,
    isApplying,
    isAnalyzing,
    isExporting,
    error,
    analysisError,
    handleUpload,
    handleStyleChange,
    handleGroupStyleChange,
    handleAnalyze,
    handleExport,
  };
}
