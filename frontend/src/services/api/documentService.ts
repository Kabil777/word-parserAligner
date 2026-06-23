import axiosInstance from '../../lib/axiosInstance';
import type { DocumentStyleInfo, DetectedStyleGroup } from '../../types/document.types';

export const documentService = {
  upload: async (
    file: File,
  ): Promise<{ sessionId: string; originalName: string; documentStyles: DocumentStyleInfo[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axiosInstance.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  analyzeStructure: async (
    sessionId: string,
    apiKey: string,
  ): Promise<DetectedStyleGroup[]> => {
    const res = await axiosInstance.post('/analysis/analyze', { sessionId, apiKey });
    return res.data.data.detectedGroups as DetectedStyleGroup[];
  },

  applyStyles: async (sessionId: string, styles: Record<string, unknown>): Promise<Blob> => {
    const res = await axiosInstance.post(
      '/documents/preview',
      { sessionId, styles },
      { responseType: 'arraybuffer' },
    );
    return new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  },

  exportDoc: async (sessionId: string, styles: Record<string, unknown>): Promise<void> => {
    const res = await axiosInstance.post(
      '/documents/export',
      { sessionId, styles },
      { responseType: 'arraybuffer' },
    );
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aligned.docx';
    a.click();
    URL.revokeObjectURL(url);
  },
};
