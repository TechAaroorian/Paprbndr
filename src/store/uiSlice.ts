import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ActiveTab, UIState } from '../types/pdf';

const initialState: UIState = {
  activeTab: 'viewer',
  isProcessing: false,
  processingMessage: '',
  notification: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<ActiveTab>) => {
      state.activeTab = action.payload;
    },
    setProcessing: (
      state,
      action: PayloadAction<{ isProcessing: boolean; message?: string }>
    ) => {
      state.isProcessing = action.payload.isProcessing;
      state.processingMessage = action.payload.message || '';
    },
    setNotification: (
      state,
      action: PayloadAction<{
        type: 'info' | 'success' | 'warning' | 'error';
        message: string;
      } | null>
    ) => {
      if (action.payload) {
        state.notification = {
          id: Date.now().toString(),
          ...action.payload,
        };
      } else {
        state.notification = null;
      }
    },
    clearNotification: (state) => {
      state.notification = null;
    },
  },
});

export const {
  setActiveTab,
  setProcessing,
  setNotification,
  clearNotification,
} = uiSlice.actions;

export default uiSlice.reducer;
