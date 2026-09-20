import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DiffMode, DiffState } from '../types/pdf';

const initialState: DiffState = {
  docAId: null,
  docBId: null,
  pageA: 1,
  pageB: 1,
  isSyncLocked: true,
  diffMode: 'swipe',
  swipePercent: 50,
  zoom: 1.0,
  sensitivity: 25,
};

export const diffSlice = createSlice({
  name: 'diff',
  initialState,
  reducers: {
    setDocA: (state, action: PayloadAction<string | null>) => {
      state.docAId = action.payload;
      state.pageA = 1;
    },
    setDocB: (state, action: PayloadAction<string | null>) => {
      state.docBId = action.payload;
      state.pageB = 1;
    },
    setComparisonDocs: (
      state,
      action: PayloadAction<{ docAId: string; docBId: string }>
    ) => {
      state.docAId = action.payload.docAId;
      state.docBId = action.payload.docBId;
      state.pageA = 1;
      state.pageB = 1;
    },
    swapDocs: (state) => {
      const tempDoc = state.docAId;
      const tempPage = state.pageA;
      state.docAId = state.docBId;
      state.pageA = state.pageB;
      state.docBId = tempDoc;
      state.pageB = tempPage;
    },
    setPageA: (state, action: PayloadAction<number>) => {
      state.pageA = Math.max(1, action.payload);
      if (state.isSyncLocked) {
        state.pageB = state.pageA;
      }
    },
    setPageB: (state, action: PayloadAction<number>) => {
      state.pageB = Math.max(1, action.payload);
      if (state.isSyncLocked) {
        state.pageA = state.pageB;
      }
    },
    nextPages: (
      state,
      action: PayloadAction<{ maxA: number; maxB: number }>
    ) => {
      if (state.isSyncLocked) {
        const max = Math.max(action.payload.maxA, action.payload.maxB);
        if (state.pageA < max) {
          state.pageA += 1;
          state.pageB += 1;
        }
      } else {
        if (state.pageA < action.payload.maxA) state.pageA += 1;
      }
    },
    prevPages: (state) => {
      if (state.isSyncLocked) {
        if (state.pageA > 1 || state.pageB > 1) {
          state.pageA = Math.max(1, state.pageA - 1);
          state.pageB = Math.max(1, state.pageB - 1);
        }
      } else {
        state.pageA = Math.max(1, state.pageA - 1);
      }
    },
    toggleSyncLock: (state) => {
      state.isSyncLocked = !state.isSyncLocked;
    },
    setDiffMode: (state, action: PayloadAction<DiffMode>) => {
      state.diffMode = action.payload;
    },
    setSwipePercent: (state, action: PayloadAction<number>) => {
      state.swipePercent = Math.max(0, Math.min(100, action.payload));
    },
    setDiffZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.3, Math.min(3.0, action.payload));
    },
    diffZoomIn: (state) => {
      state.zoom = Math.min(+(state.zoom + 0.15).toFixed(2), 3.0);
    },
    diffZoomOut: (state) => {
      state.zoom = Math.max(+(state.zoom - 0.15).toFixed(2), 0.3);
    },
    resetDiff: (state) => {
      state.pageA = 1;
      state.pageB = 1;
      state.zoom = 1.0;
      state.swipePercent = 50;
    },
  },
});

export const {
  setDocA,
  setDocB,
  setComparisonDocs,
  swapDocs,
  setPageA,
  setPageB,
  nextPages,
  prevPages,
  toggleSyncLock,
  setDiffMode,
  setSwipePercent,
  setDiffZoom,
  diffZoomIn,
  diffZoomOut,
  resetDiff,
} = diffSlice.actions;

export default diffSlice.reducer;
