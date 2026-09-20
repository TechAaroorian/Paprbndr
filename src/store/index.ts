import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import documentsReducer from './documentsSlice';
import viewerReducer from './viewerSlice';
import uiReducer from './uiSlice';
import diffReducer from './diffSlice';

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    viewer: viewerReducer,
    ui: uiReducer,
    diff: diffReducer,
  },
  // Binary buffers are managed via bufferRegistry.ts to keep state lean, fast, and serializable
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
