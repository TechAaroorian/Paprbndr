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

export type ActiveTab = 'viewer' | 'merge' | 'diff';
export type ViewScaleMode = 'fit-width' | 'fit-page' | 'custom';
export type PageLayoutMode = 'continuous' | 'single';
export type DiffMode = 'swipe' | 'difference' | 'side-by-side';

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
