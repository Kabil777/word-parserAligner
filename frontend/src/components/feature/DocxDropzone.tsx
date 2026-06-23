'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

interface DocxDropzoneProps {
  onFileAccepted: (file: File) => void;
  isUploading: boolean;
  error?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocxDropzone({ onFileAccepted, isUploading, error }: DocxDropzoneProps) {
  const [droppedFile, setDroppedFile] = React.useState<File | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        setDroppedFile(accepted[0]);
        onFileAccepted(accepted[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: isUploading,
  });

  const borderColor = isDragReject
    ? 'border-red-500'
    : isDragActive
    ? 'border-[var(--primary)]'
    : 'border-[var(--border)]';

  const bgColor = isDragActive
    ? 'bg-[var(--primary)]/5'
    : 'bg-[var(--card)]/60';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto gap-4">
      <div
        {...getRootProps()}
        className={`
          relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          backdrop-blur-sm p-12 flex flex-col items-center justify-center gap-4 group
          ${borderColor} ${bgColor}
          ${isUploading ? 'pointer-events-none opacity-70' : 'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5'}
        `}
      >
        <input {...getInputProps()} />

        {/* Animated glow ring */}
        {isDragActive && (
          <div className="absolute inset-0 rounded-2xl ring-4 ring-[var(--primary)]/30 animate-pulse pointer-events-none" />
        )}

        {isUploading ? (
          <>
            <Loader2 className="w-14 h-14 text-[var(--primary)] animate-spin" />
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Uploading document…</p>
          </>
        ) : droppedFile ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)] text-sm">{droppedFile.name}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatBytes(droppedFile.size)}</p>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Drop a new file to replace</p>
          </>
        ) : (
          <>
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              bg-[var(--muted)] group-hover:bg-[var(--primary)]/10
            `}>
              <Upload className={`
                w-8 h-8 transition-colors duration-300
                text-[var(--muted-foreground)] group-hover:text-[var(--primary)]
                ${isDragActive ? 'text-[var(--primary)] scale-110' : ''}
              `} />
            </div>

            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-[var(--foreground)]">
                {isDragActive ? 'Release to upload' : 'Drop your .docx file here'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                or <span className="text-[var(--primary)] font-medium underline underline-offset-2 cursor-pointer">browse files</span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-3 py-1.5 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              <span>Only .docx files accepted</span>
            </div>
          </>
        )}

        {isDragReject && (
          <p className="text-xs text-red-500 font-medium">Invalid file type — only .docx is accepted</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 w-full">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
