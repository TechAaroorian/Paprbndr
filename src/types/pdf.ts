export interface PDFPageItem {
  id: string;
  originalPageNumber: number; // 1-indexed in source doc
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
  thumbnailUrl?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  isExpanded: boolean;
  pages: PDFPageItem[];
  createdAt: number;
}

export type ActiveTab = 'viewer' | 'merge' | 'diff' | 'markdown';
export type ViewScaleMode = 'fit-width' | 'fit-page' | 'custom';
export type PageLayoutMode = 'continuous' | 'single';
export type DiffMode = 'swipe' | 'difference' | 'side-by-side';
export type PdfReadingTheme = 'original' | 'sepia' | 'night';

export interface DiffState {
  docAId: string | null;
  docBId: string | null;
  pageA: number;
  pageB: number;
  isSyncLocked: boolean;
  diffMode: DiffMode;
  swipePercent: number; // 0 to 100
  zoom: number;
  sensitivity: number; // 1 to 50
}

export interface ViewerState {
  activeDocId: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number; // scale e.g. 1.0 = 100%
  scaleMode: ViewScaleMode;
  rotation: number; // 0, 90, 180, 270
  layoutMode: PageLayoutMode;
  sidebarOpen: boolean;
  readingTheme: PdfReadingTheme;
  zenMode: boolean;
}

export interface MarkdownAsset {
  id: string;
  name: string;
  size: number; // bytes
  dataUrl: string;
  mimeType: string;
  createdAt: number;
}

export type MarkdownReadingTheme = 'light' | 'sepia' | 'dark' | 'nord';
export type MarkdownFontFamily = 'sans' | 'serif' | 'mono';
export type MarkdownFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type MarkdownColumnWidth = 'compact' | 'comfortable' | 'full';
export type MarkdownStudioLayout = 'split' | 'editor-only' | 'reader-only';

export interface MarkdownReadingSettings {
  theme: MarkdownReadingTheme;
  fontFamily: MarkdownFontFamily;
  fontSize: MarkdownFontSize;
  columnWidth: MarkdownColumnWidth;
  zenMode: boolean;
  layout: MarkdownStudioLayout;
}

export interface PdfExportSettings {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includePageNumbers: boolean;
  includeHeader: boolean;
  title: string;
}

export interface MarkdownState {
  content: string;
  assets: MarkdownAsset[];
  readingSettings: MarkdownReadingSettings;
  exportSettings: PdfExportSettings;
  isAssetModalOpen: boolean;
  isExporting: boolean;
}

export interface UIState {
  activeTab: ActiveTab;
  isProcessing: boolean;
  processingMessage: string;
  notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  } | null;
}
