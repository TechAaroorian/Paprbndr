import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReadingSettingsBar } from '../components/markdown/ReadingSettingsBar';
import markdownReducer from '../store/markdownSlice';

function renderWithStore(ui: React.ReactElement) {
  const testStore = configureStore({
    reducer: {
      markdown: markdownReducer,
    },
  });

  return {
    ...render(<Provider store={testStore}>{ui}</Provider>),
    store: testStore,
  };
}

describe('ReadingSettingsBar Component', () => {
  const mockStats = {
    wordCount: 350,
    charCount: 2100,
    readingTimeMinutes: 2,
  };

  it('renders reading stats and view mode buttons', () => {
    renderWithStore(<ReadingSettingsBar stats={mockStats} />);

    expect(screen.getByText(/2 min read/i)).toBeInTheDocument();
    expect(screen.getByText(/350 words/i)).toBeInTheDocument();
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Reader')).toBeInTheDocument();
  });

  it('switches layout mode when Split, Editor, or Reader is clicked', () => {
    const { store } = renderWithStore(<ReadingSettingsBar stats={mockStats} />);

    // Default layout is split
    expect(store.getState().markdown.readingSettings.layout).toBe('split');

    // Click Reader
    fireEvent.click(screen.getByText('Reader'));
    expect(store.getState().markdown.readingSettings.layout).toBe('reader-only');

    // Click Editor
    fireEvent.click(screen.getByText('Editor'));
    expect(store.getState().markdown.readingSettings.layout).toBe('editor-only');
  });

  it('changes reading theme when theme chips are clicked', () => {
    const { store } = renderWithStore(<ReadingSettingsBar stats={mockStats} />);

    fireEvent.click(screen.getByText('Sepia'));
    expect(store.getState().markdown.readingSettings.theme).toBe('sepia');

    fireEvent.click(screen.getByText('Dark'));
    expect(store.getState().markdown.readingSettings.theme).toBe('dark');

    fireEvent.click(screen.getByText('Nord'));
    expect(store.getState().markdown.readingSettings.theme).toBe('nord');

    fireEvent.click(screen.getByText('Light'));
    expect(store.getState().markdown.readingSettings.theme).toBe('light');
  });

  it('changes font family and font size', () => {
    const { store } = renderWithStore(<ReadingSettingsBar stats={mockStats} />);

    fireEvent.click(screen.getByText('Serif'));
    expect(store.getState().markdown.readingSettings.fontFamily).toBe('serif');

    fireEvent.click(screen.getByText('Mono'));
    expect(store.getState().markdown.readingSettings.fontFamily).toBe('mono');

    fireEvent.click(screen.getByText('XL'));
    expect(store.getState().markdown.readingSettings.fontSize).toBe('xl');
  });

  it('toggles Zen Mode on click', () => {
    const { store } = renderWithStore(<ReadingSettingsBar stats={mockStats} />);

    expect(store.getState().markdown.readingSettings.zenMode).toBe(false);

    const zenBtn = screen.getByText('Zen Mode');
    fireEvent.click(zenBtn);
    expect(store.getState().markdown.readingSettings.zenMode).toBe(true);

    fireEvent.click(screen.getByText('Exit Zen'));
    expect(store.getState().markdown.readingSettings.zenMode).toBe(false);
  });
});
