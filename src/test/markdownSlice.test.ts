import { describe, it, expect } from 'vitest';
import {
  markdownSlice,
  setMarkdownContent,
  updateReadingSettings,
  updateExportSettings,
  addAsset,
  removeAsset,
  clearAssets,
  resetMarkdownToSample,
  MAX_MARKDOWN_ASSETS,
} from '../store/markdownSlice';
import type { MarkdownAsset, MarkdownState } from '../types/pdf';

describe('markdownSlice Reducer & Actions', () => {
  const initialState: MarkdownState = {
    content: 'Initial text',
    assets: [],
    readingSettings: {
      theme: 'light',
      fontFamily: 'sans',
      fontSize: 'base',
      columnWidth: 'comfortable',
      zenMode: false,
      layout: 'split',
    },
    exportSettings: {
      pageSize: 'A4',
      orientation: 'portrait',
      includePageNumbers: true,
      includeHeader: true,
      title: 'Paprbndr Document',
    },
    isAssetModalOpen: false,
    isExporting: false,
  };

  it('updates markdown content correctly', () => {
    const nextState = markdownSlice.reducer(
      initialState,
      setMarkdownContent('# New Document Title')
    );
    expect(nextState.content).toBe('# New Document Title');
  });

  it('updates reading settings (theme, layout, font, size, column width, zenMode)', () => {
    let state = markdownSlice.reducer(
      initialState,
      updateReadingSettings({ theme: 'sepia', layout: 'reader-only' })
    );
    expect(state.readingSettings.theme).toBe('sepia');
    expect(state.readingSettings.layout).toBe('reader-only');

    state = markdownSlice.reducer(
      state,
      updateReadingSettings({ fontFamily: 'serif', fontSize: 'xl', zenMode: true })
    );
    expect(state.readingSettings.fontFamily).toBe('serif');
    expect(state.readingSettings.fontSize).toBe('xl');
    expect(state.readingSettings.zenMode).toBe(true);
  });

  it('updates export settings (pageSize, orientation, includePageNumbers)', () => {
    const state = markdownSlice.reducer(
      initialState,
      updateExportSettings({ pageSize: 'Letter', orientation: 'landscape', title: 'Q1 Report' })
    );
    expect(state.exportSettings.pageSize).toBe('Letter');
    expect(state.exportSettings.orientation).toBe('landscape');
    expect(state.exportSettings.title).toBe('Q1 Report');
  });

  it('enforces maximum 5 image assets limit', () => {
    let state = initialState;

    // Add 5 assets
    for (let i = 1; i <= 5; i++) {
      const asset: MarkdownAsset = {
        id: `asset_${i}`,
        name: `image_${i}.png`,
        size: 1024,
        dataUrl: 'data:image/png;base64,...',
        mimeType: 'image/png',
        createdAt: Date.now(),
      };
      state = markdownSlice.reducer(state, addAsset(asset));
    }
    expect(state.assets).toHaveLength(MAX_MARKDOWN_ASSETS);

    // Attempt to add a 6th asset (should be ignored / rejected)
    const excessAsset: MarkdownAsset = {
      id: 'asset_6',
      name: 'image_6.png',
      size: 1024,
      dataUrl: 'data:image/png;base64,...',
      mimeType: 'image/png',
      createdAt: Date.now(),
    };
    state = markdownSlice.reducer(state, addAsset(excessAsset));
    expect(state.assets).toHaveLength(MAX_MARKDOWN_ASSETS);
  });

  it('removes an asset by ID', () => {
    const asset1: MarkdownAsset = {
      id: 'asset_a',
      name: 'diagram.png',
      size: 2000,
      dataUrl: 'data:image/png;base64,...',
      mimeType: 'image/png',
      createdAt: Date.now(),
    };
    const asset2: MarkdownAsset = {
      id: 'asset_b',
      name: 'chart.png',
      size: 3000,
      dataUrl: 'data:image/png;base64,...',
      mimeType: 'image/png',
      createdAt: Date.now(),
    };

    let state = markdownSlice.reducer(initialState, addAsset(asset1));
    state = markdownSlice.reducer(state, addAsset(asset2));
    expect(state.assets).toHaveLength(2);

    state = markdownSlice.reducer(state, removeAsset('asset_a'));
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0].id).toBe('asset_b');
  });

  it('clears all assets on clearAssets', () => {
    const asset: MarkdownAsset = {
      id: 'asset_1',
      name: 'test.png',
      size: 100,
      dataUrl: 'data:...',
      mimeType: 'image/png',
      createdAt: Date.now(),
    };
    let state = markdownSlice.reducer(initialState, addAsset(asset));
    expect(state.assets).toHaveLength(1);

    state = markdownSlice.reducer(state, clearAssets());
    expect(state.assets).toHaveLength(0);
  });

  it('resets markdown to sample document on resetMarkdownToSample', () => {
    let state = markdownSlice.reducer(initialState, setMarkdownContent('Custom text'));
    expect(state.content).toBe('Custom text');

    state = markdownSlice.reducer(state, resetMarkdownToSample());
    expect(state.content).toContain('# Engineering Architecture & System Overview');
  });
});
