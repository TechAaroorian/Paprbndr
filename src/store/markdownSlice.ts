import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  MarkdownAsset,
  MarkdownReadingSettings,
  PdfExportSettings,
  MarkdownState,
} from '../types/pdf';

export const MAX_MARKDOWN_ASSETS = 5;
export const MAX_ASSET_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const DEFAULT_MARKDOWN_SAMPLE = `# Engineering Architecture & System Overview
> **Paprbndr Studio** • Executive Technical Report & Specification

## 1. Executive Summary
Paprbndr is engineered as a **100% client-side** PDF workspace and markdown reading studio. It runs completely inside browser volatile RAM, ensuring zero data egress and absolute privacy for sensitive contracts, medical records, and technical briefs.

---

## 2. Core Architecture Pillars
Modern web apps often sacrifice user privacy by uploading confidential documents to remote cloud storage. In contrast, Paprbndr uses local in-memory rendering:

1. **High-DPI Canvas Rendering** via \`pdfjs-dist\` with native \`devicePixelRatio\` scaling.
2. **Structural Manipulation & Merging** via \`pdf-lib\`.
3. **Immutable Memory Management** to guard against Web Worker buffer detachment.
4. **Visual Document Diffing** with split swipe handles and pixel difference heatmaps.
5. **Immersive Markdown Studio** with real-time typography scaling and PDF compilation.

---

## 3. Performance & Memory Benchmarks

| Document Size | Parsing Latency | Render Time (60 FPS) | RAM Utilization |
| :--- | :--- | :--- | :--- |
| **5 Pages** | 18 ms | 12 ms | ~8 MB |
| **25 Pages** | 64 ms | 28 ms | ~24 MB |
| **100 Pages** | 210 ms | 76 ms | ~68 MB |

---

## 4. Key Implementation Logic
The memory bridge creates independent \`ArrayBuffer\` copies from immutable Blobs:

\`\`\`typescript
export async function getFreshBuffer(id: string): Promise<ArrayBuffer> {
  const blob = registry.get(id);
  if (!blob) throw new Error(\`Blob \${id} not found in local RAM\`);
  
  // Produces an un-detached buffer safely on each invocation
  return await blob.arrayBuffer();
}
\`\`\`

---

## 5. Visual Attachments
*Add up to 5 image assets (max 2 MB each) using the **Asset Manager** in the toolbar above to embed architectural diagrams, signatures, or photos directly into this document.*

### Summary Checklist
- [x] Client-side memory isolation
- [x] Zero cloud upload telemetry
- [x] High UX reader with warm sepia & night modes
- [x] Clean page-break PDF compilation
`;

const initialReadingSettings: MarkdownReadingSettings = {
  theme: 'light',
  fontFamily: 'sans',
  fontSize: 'base',
  columnWidth: 'comfortable',
  zenMode: false,
  layout: 'split',
};

const initialExportSettings: PdfExportSettings = {
  pageSize: 'A4',
  orientation: 'portrait',
  includePageNumbers: true,
  includeHeader: true,
  title: 'Paprbndr Document',
};

const initialState: MarkdownState = {
  content: DEFAULT_MARKDOWN_SAMPLE,
  assets: [],
  readingSettings: initialReadingSettings,
  exportSettings: initialExportSettings,
  isAssetModalOpen: false,
  isExporting: false,
};

export const markdownSlice = createSlice({
  name: 'markdown',
  initialState,
  reducers: {
    setMarkdownContent: (state, action: PayloadAction<string>) => {
      state.content = action.payload;
    },
    addAsset: (state, action: PayloadAction<MarkdownAsset>) => {
      if (state.assets.length >= MAX_MARKDOWN_ASSETS) {
        return; // Guard: max 5 assets
      }
      if (action.payload.size > MAX_ASSET_SIZE_BYTES) {
        return; // Guard: max 2MB
      }
      state.assets.push(action.payload);
    },
    removeAsset: (state, action: PayloadAction<string>) => {
      state.assets = state.assets.filter((a) => a.id !== action.payload);
    },
    clearAssets: (state) => {
      state.assets = [];
    },
    updateReadingSettings: (
      state,
      action: PayloadAction<Partial<MarkdownReadingSettings>>
    ) => {
      state.readingSettings = { ...state.readingSettings, ...action.payload };
    },
    updateExportSettings: (
      state,
      action: PayloadAction<Partial<PdfExportSettings>>
    ) => {
      state.exportSettings = { ...state.exportSettings, ...action.payload };
    },
    setAssetModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAssetModalOpen = action.payload;
    },
    setExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
    },
    resetMarkdownToSample: (state) => {
      state.content = DEFAULT_MARKDOWN_SAMPLE;
    },
  },
});

export const {
  setMarkdownContent,
  addAsset,
  removeAsset,
  clearAssets,
  updateReadingSettings,
  updateExportSettings,
  setAssetModalOpen,
  setExporting,
  resetMarkdownToSample,
} = markdownSlice.actions;

export default markdownSlice.reducer;
