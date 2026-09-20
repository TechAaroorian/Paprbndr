import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DocumentItem } from '../types/pdf';

interface DocumentsState {
  items: DocumentItem[];
  selectedDocId: string | null;
}

const initialState: DocumentsState = {
  items: [],
  selectedDocId: null,
};

export const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    addDocuments: (state, action: PayloadAction<DocumentItem[]>) => {
      state.items.push(...action.payload);
      if (!state.selectedDocId && state.items.length > 0) {
        state.selectedDocId = state.items[0].id;
      }
    },
    removeDocument: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((doc) => doc.id !== action.payload);
      if (state.selectedDocId === action.payload) {
        state.selectedDocId = state.items.length > 0 ? state.items[0].id : null;
      }
    },
    reorderDocuments: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex < 0 ||
        fromIndex >= state.items.length ||
        toIndex < 0 ||
        toIndex >= state.items.length
      ) {
        return;
      }
      const [movedDoc] = state.items.splice(fromIndex, 1);
      state.items.splice(toIndex, 0, movedDoc);
    },
    moveDocumentUp: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex((d) => d.id === action.payload);
      if (index > 0) {
        const [doc] = state.items.splice(index, 1);
        state.items.splice(index - 1, 0, doc);
      }
    },
    moveDocumentDown: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex((d) => d.id === action.payload);
      if (index >= 0 && index < state.items.length - 1) {
        const [doc] = state.items.splice(index, 1);
        state.items.splice(index + 1, 0, doc);
      }
    },
    toggleExpandDocument: (state, action: PayloadAction<string>) => {
      const doc = state.items.find((d) => d.id === action.payload);
      if (doc) {
        doc.isExpanded = !doc.isExpanded;
      }
    },
    toggleDeletePage: (
      state,
      action: PayloadAction<{ docId: string; pageId: string }>
    ) => {
      const doc = state.items.find((d) => d.id === action.payload.docId);
      if (doc) {
        const page = doc.pages.find((p) => p.id === action.payload.pageId);
        if (page) {
          page.isDeleted = !page.isDeleted;
        }
      }
    },
    rotatePage: (
      state,
      action: PayloadAction<{ docId: string; pageId: string; deltaAngle?: number }>
    ) => {
      const doc = state.items.find((d) => d.id === action.payload.docId);
      if (doc) {
        const page = doc.pages.find((p) => p.id === action.payload.pageId);
        if (page) {
          const delta = action.payload.deltaAngle ?? 90;
          page.rotation = (page.rotation + delta) % 360;
          // Invalidate thumbnail URL so it regenerates on rotation
          page.thumbnailUrl = undefined;
        }
      }
    },
    reorderPage: (
      state,
      action: PayloadAction<{ docId: string; fromIndex: number; toIndex: number }>
    ) => {
      const { docId, fromIndex, toIndex } = action.payload;
      const doc = state.items.find((d) => d.id === docId);
      if (doc) {
        if (
          fromIndex < 0 ||
          fromIndex >= doc.pages.length ||
          toIndex < 0 ||
          toIndex >= doc.pages.length
        ) {
          return;
        }
        const [movedPage] = doc.pages.splice(fromIndex, 1);
        doc.pages.splice(toIndex, 0, movedPage);
      }
    },
    updatePageThumbnail: (
      state,
      action: PayloadAction<{ docId: string; pageId: string; thumbnailUrl: string }>
    ) => {
      const doc = state.items.find((d) => d.id === action.payload.docId);
      if (doc) {
        const page = doc.pages.find((p) => p.id === action.payload.pageId);
        if (page) {
          page.thumbnailUrl = action.payload.thumbnailUrl;
        }
      }
    },
    setSelectedDocId: (state, action: PayloadAction<string | null>) => {
      state.selectedDocId = action.payload;
    },
    clearAllDocuments: (state) => {
      state.items = [];
      state.selectedDocId = null;
    },
  },
});

export const {
  addDocuments,
  removeDocument,
  reorderDocuments,
  moveDocumentUp,
  moveDocumentDown,
  toggleExpandDocument,
  toggleDeletePage,
  rotatePage,
  reorderPage,
  updatePageThumbnail,
  setSelectedDocId,
  clearAllDocuments,
} = documentsSlice.actions;

export default documentsSlice.reducer;
