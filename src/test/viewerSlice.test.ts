import { describe, it, expect } from 'vitest';
import {
  viewerSlice,
  setViewerDoc,
  setCurrentPage,
  nextPage,
  prevPage,
  setZoom,
  zoomIn,
  zoomOut,
  rotateViewer,
  setLayoutMode,
  setReadingTheme,
  toggleZenMode,
  setZenMode,
} from '../store/viewerSlice';
import type { ViewerState } from '../types/pdf';

describe('viewerSlice Reducer & Actions', () => {
  const initialState: ViewerState = {
    activeDocId: null,
    currentPage: 1,
    totalPages: 1,
    zoom: 1.0,
    scaleMode: 'fit-width',
    rotation: 0,
    layoutMode: 'continuous',
    sidebarOpen: true,
    readingTheme: 'original',
    zenMode: false,
  };

  it('sets active viewer document and updates total pages', () => {
    const state = viewerSlice.reducer(
      initialState,
      setViewerDoc({ docId: 'doc_123', totalPages: 10 })
    );
    expect(state.activeDocId).toBe('doc_123');
    expect(state.totalPages).toBe(10);
    expect(state.currentPage).toBe(1);
    expect(state.rotation).toBe(0);
  });

  it('handles page navigation with bounds checking', () => {
    let state = viewerSlice.reducer(
      { ...initialState, totalPages: 3, currentPage: 1 },
      nextPage()
    );
    expect(state.currentPage).toBe(2);

    state = viewerSlice.reducer(state, nextPage());
    expect(state.currentPage).toBe(3);

    // Cannot advance past last page
    state = viewerSlice.reducer(state, nextPage());
    expect(state.currentPage).toBe(3);

    // Go back
    state = viewerSlice.reducer(state, prevPage());
    expect(state.currentPage).toBe(2);

    state = viewerSlice.reducer(state, prevPage());
    expect(state.currentPage).toBe(1);

    // Cannot go before first page
    state = viewerSlice.reducer(state, prevPage());
    expect(state.currentPage).toBe(1);
  });

  it('clamps setCurrentPage to valid range [1, totalPages]', () => {
    const stateWithPages = { ...initialState, totalPages: 5 };

    let state = viewerSlice.reducer(stateWithPages, setCurrentPage(3));
    expect(state.currentPage).toBe(3);

    state = viewerSlice.reducer(stateWithPages, setCurrentPage(99));
    expect(state.currentPage).toBe(5);

    state = viewerSlice.reducer(stateWithPages, setCurrentPage(-5));
    expect(state.currentPage).toBe(1);
  });

  it('handles zoomIn and zoomOut within clamped boundaries (0.25 to 5.0)', () => {
    let state = viewerSlice.reducer(initialState, zoomIn());
    expect(state.zoom).toBeCloseTo(1.15, 2);

    state = viewerSlice.reducer(state, zoomOut());
    expect(state.zoom).toBeCloseTo(1.0, 2);

    // Set custom zoom
    state = viewerSlice.reducer(state, setZoom(2.5));
    expect(state.zoom).toBe(2.5);

    // Upper limit clamp at 4.0
    state = viewerSlice.reducer(state, setZoom(10.0));
    expect(state.zoom).toBe(4.0);

    // Lower limit clamp at 0.25
    state = viewerSlice.reducer(state, setZoom(0.05));
    expect(state.zoom).toBe(0.25);
  });

  it('rotates viewer in 90 degree clockwise increments and wraps around 360', () => {
    let state = viewerSlice.reducer(initialState, rotateViewer());
    expect(state.rotation).toBe(90);

    state = viewerSlice.reducer(state, rotateViewer());
    expect(state.rotation).toBe(180);

    state = viewerSlice.reducer(state, rotateViewer());
    expect(state.rotation).toBe(270);

    state = viewerSlice.reducer(state, rotateViewer());
    expect(state.rotation).toBe(0);
  });

  it('toggles and sets Zen Mode', () => {
    let state = viewerSlice.reducer(initialState, toggleZenMode());
    expect(state.zenMode).toBe(true);

    state = viewerSlice.reducer(state, toggleZenMode());
    expect(state.zenMode).toBe(false);

    state = viewerSlice.reducer(state, setZenMode(true));
    expect(state.zenMode).toBe(true);
  });

  it('changes reading theme and layout mode', () => {
    let state = viewerSlice.reducer(initialState, setReadingTheme('sepia'));
    expect(state.readingTheme).toBe('sepia');

    state = viewerSlice.reducer(state, setLayoutMode('single'));
    expect(state.layoutMode).toBe('single');
  });
});
