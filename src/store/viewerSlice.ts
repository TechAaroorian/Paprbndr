import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PageLayoutMode, ViewScaleMode } from '../types/pdf';

interface ViewerState {
  activeDocId: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  scaleMode: ViewScaleMode;
  rotation: number;
  layoutMode: PageLayoutMode;
  sidebarOpen: boolean;
}

const initialState: ViewerState = {
  activeDocId: null,
  currentPage: 1,
  totalPages: 1,
  zoom: 1.0,
  scaleMode: 'fit-width',
  rotation: 0,
  layoutMode: 'continuous',
  sidebarOpen: true,
};

export const viewerSlice = createSlice({
  name: 'viewer',
  initialState,
  reducers: {
    setViewerDoc: (
      state,
      action: PayloadAction<{ docId: string; totalPages: number }>
    ) => {
      state.activeDocId = action.payload.docId;
      state.totalPages = action.payload.totalPages;
      state.currentPage = 1;
      state.rotation = 0;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      const p = Math.max(1, Math.min(action.payload, state.totalPages));
      state.currentPage = p;
    },
    nextPage: (state) => {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
      }
    },
    prevPage: (state) => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
      }
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.25, Math.min(action.payload, 4.0));
      state.scaleMode = 'custom';
    },
    zoomIn: (state) => {
      state.zoom = Math.min(+(state.zoom + 0.15).toFixed(2), 4.0);
      state.scaleMode = 'custom';
    },
    zoomOut: (state) => {
      state.zoom = Math.max(+(state.zoom - 0.15).toFixed(2), 0.25);
      state.scaleMode = 'custom';
    },
    setScaleMode: (state, action: PayloadAction<ViewScaleMode>) => {
      state.scaleMode = action.payload;
    },
    rotateViewer: (state, action: PayloadAction<number | undefined>) => {
      const delta = action.payload ?? 90;
      state.rotation = (state.rotation + delta) % 360;
    },
    setLayoutMode: (state, action: PayloadAction<PageLayoutMode>) => {
      state.layoutMode = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    resetViewer: (state) => {
      state.currentPage = 1;
      state.zoom = 1.0;
      state.scaleMode = 'fit-width';
      state.rotation = 0;
    },
  },
});

export const {
  setViewerDoc,
  setCurrentPage,
  nextPage,
  prevPage,
  setZoom,
  zoomIn,
  zoomOut,
  setScaleMode,
  rotateViewer,
  setLayoutMode,
  toggleSidebar,
  resetViewer,
} = viewerSlice.actions;

export default viewerSlice.reducer;
