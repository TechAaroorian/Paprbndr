import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateReadingSettings } from '../../store/markdownSlice';
import type {
  MarkdownReadingTheme,
  MarkdownFontFamily,
  MarkdownFontSize,
  MarkdownColumnWidth,
  MarkdownStudioLayout,
} from '../../types/pdf';
import type { ReadingStats } from '../../services/markdownPdfService';
import {
  Sun,
  Coffee,
  Moon,
  Compass,
  Type,
  Maximize2,
  Minimize2,
  Columns,
  BookOpen,
  Edit3,
  Clock,
  FileText,
} from 'lucide-react';

interface ReadingSettingsBarProps {
  stats: ReadingStats;
}

export const ReadingSettingsBar: React.FC<ReadingSettingsBarProps> = ({ stats }) => {
  const dispatch = useAppDispatch();
  const readingSettings = useAppSelector((state) => state.markdown.readingSettings);

  const handleThemeChange = (theme: MarkdownReadingTheme) => {
    dispatch(updateReadingSettings({ theme }));
  };

  const handleFontChange = (fontFamily: MarkdownFontFamily) => {
    dispatch(updateReadingSettings({ fontFamily }));
  };

  const handleSizeChange = (fontSize: MarkdownFontSize) => {
    dispatch(updateReadingSettings({ fontSize }));
  };

  const handleWidthChange = (columnWidth: MarkdownColumnWidth) => {
    dispatch(updateReadingSettings({ columnWidth }));
  };

  const handleLayoutChange = (layout: MarkdownStudioLayout) => {
    dispatch(updateReadingSettings({ layout }));
  };

  const handleToggleZen = () => {
    dispatch(updateReadingSettings({ zenMode: !readingSettings.zenMode }));
  };

  return (
    <div className="reading-settings-bar">
      {/* 1. Layout Mode Switcher */}
      <div className="settings-group">
        <span className="settings-label">View:</span>
        <div className="settings-toggle-pill">
          <button
            type="button"
            className={`toggle-btn ${readingSettings.layout === 'split' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('split')}
            title="Split 50/50 View"
          >
            <Columns size={15} />
            <span>Split</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${readingSettings.layout === 'editor-only' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('editor-only')}
            title="Editor Focus"
          >
            <Edit3 size={15} />
            <span>Editor</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${readingSettings.layout === 'reader-only' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('reader-only')}
            title="Reader Focus"
          >
            <BookOpen size={15} />
            <span>Reader</span>
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      {/* 2. Reading Tone / Theme */}
      <div className="settings-group">
        <span className="settings-label">Tone:</span>
        <div className="settings-toggle-pill">
          <button
            type="button"
            className={`theme-chip light ${readingSettings.theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
            title="Editorial White"
          >
            <Sun size={14} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`theme-chip sepia ${readingSettings.theme === 'sepia' ? 'active' : ''}`}
            onClick={() => handleThemeChange('sepia')}
            title="Warm Eye-Comfort Sepia"
          >
            <Coffee size={14} />
            <span>Sepia</span>
          </button>
          <button
            type="button"
            className={`theme-chip dark ${readingSettings.theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
            title="Obsidian Night Mode"
          >
            <Moon size={14} />
            <span>Dark</span>
          </button>
          <button
            type="button"
            className={`theme-chip nord ${readingSettings.theme === 'nord' ? 'active' : ''}`}
            onClick={() => handleThemeChange('nord')}
            title="Nord Slate"
          >
            <Compass size={14} />
            <span>Nord</span>
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      {/* 3. Typography: Font Family */}
      <div className="settings-group">
        <span className="settings-label">Font:</span>
        <div className="settings-toggle-pill">
          <button
            type="button"
            className={`font-chip ${readingSettings.fontFamily === 'sans' ? 'active' : ''}`}
            onClick={() => handleFontChange('sans')}
            style={{ fontFamily: 'var(--font-sans)' }}
            title="Modern Sans"
          >
            Sans
          </button>
          <button
            type="button"
            className={`font-chip ${readingSettings.fontFamily === 'serif' ? 'active' : ''}`}
            onClick={() => handleFontChange('serif')}
            style={{ fontFamily: 'Georgia, serif' }}
            title="Classic Editorial Serif"
          >
            Serif
          </button>
          <button
            type="button"
            className={`font-chip ${readingSettings.fontFamily === 'mono' ? 'active' : ''}`}
            onClick={() => handleFontChange('mono')}
            style={{ fontFamily: 'var(--font-mono)' }}
            title="Technical Mono"
          >
            Mono
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      {/* 4. Font Size */}
      <div className="settings-group">
        <Type size={14} style={{ color: 'var(--text-muted)' }} />
        <div className="settings-toggle-pill">
          <button
            type="button"
            className={`size-chip ${readingSettings.fontSize === 'sm' ? 'active' : ''}`}
            onClick={() => handleSizeChange('sm')}
            title="Small text (14px)"
          >
            S
          </button>
          <button
            type="button"
            className={`size-chip ${readingSettings.fontSize === 'base' ? 'active' : ''}`}
            onClick={() => handleSizeChange('base')}
            title="Standard text (16px)"
          >
            M
          </button>
          <button
            type="button"
            className={`size-chip ${readingSettings.fontSize === 'lg' ? 'active' : ''}`}
            onClick={() => handleSizeChange('lg')}
            title="Large text (18px)"
          >
            L
          </button>
          <button
            type="button"
            className={`size-chip ${readingSettings.fontSize === 'xl' ? 'active' : ''}`}
            onClick={() => handleSizeChange('xl')}
            title="Extra Large text (20px)"
          >
            XL
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      {/* 5. Column Width */}
      <div className="settings-group">
        <span className="settings-label">Width:</span>
        <div className="settings-toggle-pill">
          <button
            type="button"
            className={`width-chip ${readingSettings.columnWidth === 'compact' ? 'active' : ''}`}
            onClick={() => handleWidthChange('compact')}
            title="Compact reading width (Optimal eye line)"
          >
            Compact
          </button>
          <button
            type="button"
            className={`width-chip ${readingSettings.columnWidth === 'comfortable' ? 'active' : ''}`}
            onClick={() => handleWidthChange('comfortable')}
            title="Comfortable standard width"
          >
            Normal
          </button>
          <button
            type="button"
            className={`width-chip ${readingSettings.columnWidth === 'full' ? 'active' : ''}`}
            onClick={() => handleWidthChange('full')}
            title="Full available width"
          >
            Full
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      {/* 6. Reading Stats */}
      <div className="reading-stats-badge" title={`${stats.wordCount} total words`}>
        <Clock size={13} />
        <span>{stats.readingTimeMinutes} min read</span>
        <span className="stats-dot">•</span>
        <FileText size={13} />
        <span>{stats.wordCount} words</span>
      </div>

      {/* 7. Zen Mode Toggle */}
      <button
        type="button"
        className={`zen-mode-toggle ${readingSettings.zenMode ? 'active' : ''}`}
        onClick={handleToggleZen}
        title={readingSettings.zenMode ? 'Exit Zen Focus Mode' : 'Enter Zen Focus Mode'}
      >
        {readingSettings.zenMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        <span>{readingSettings.zenMode ? 'Exit Zen' : 'Zen Mode'}</span>
      </button>
    </div>
  );
};
