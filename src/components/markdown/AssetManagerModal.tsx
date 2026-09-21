import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  addAsset,
  removeAsset,
  setAssetModalOpen,
  MAX_MARKDOWN_ASSETS,
  MAX_ASSET_SIZE_BYTES,
} from '../../store/markdownSlice';
import { setNotification } from '../../store/uiSlice';
import { generateId } from '../../services/pdfService';
import type { MarkdownAsset } from '../../types/pdf';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  FileImage,
} from 'lucide-react';

interface AssetManagerModalProps {
  onInsertMarkdown: (syntax: string) => void;
}

export const AssetManagerModal: React.FC<AssetManagerModalProps> = ({
  onInsertMarkdown,
}) => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assets = useAppSelector((state) => state.markdown.assets);
  const isOpen = useAppSelector((state) => state.markdown.isAssetModalOpen);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (assets.length >= MAX_MARKDOWN_ASSETS) {
      dispatch(
        setNotification({
          type: 'warning',
          message: `Asset limit reached! You can only store up to ${MAX_MARKDOWN_ASSETS} image assets.`,
        })
      );
      return;
    }

    const remainingSlots = MAX_MARKDOWN_ASSETS - assets.length;
    const toProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      dispatch(
        setNotification({
          type: 'info',
          message: `Only adding ${remainingSlots} image(s) to stay within the maximum ${MAX_MARKDOWN_ASSETS} asset limit.`,
        })
      );
    }

    toProcess.forEach((file) => {
      // Validate image mime type
      if (!file.type.startsWith('image/')) {
        dispatch(
          setNotification({
            type: 'error',
            message: `"${file.name}" is not an image. Only PNG, JPEG, SVG, and WEBP are supported.`,
          })
        );
        return;
      }

      // Validate 2MB size limit
      if (file.size > MAX_ASSET_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        dispatch(
          setNotification({
            type: 'error',
            message: `"${file.name}" (${sizeMb} MB) exceeds the 2.0 MB maximum file size limit!`,
          })
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAsset: MarkdownAsset = {
          id: generateId(),
          name: file.name,
          size: file.size,
          dataUrl,
          mimeType: file.type,
          createdAt: Date.now(),
        };

        dispatch(addAsset(newAsset));
        dispatch(
          setNotification({
            type: 'success',
            message: `Added "${file.name}" to assets gallery.`,
          })
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const handleInsert = (asset: MarkdownAsset) => {
    const syntax = `\n![${asset.name}](asset:${asset.id})\n`;
    onInsertMarkdown(syntax);
    dispatch(setAssetModalOpen(false));
    dispatch(
      setNotification({
        type: 'success',
        message: `Inserted image "${asset.name}" into document.`,
      })
    );
  };

  const handleCopySyntax = (asset: MarkdownAsset) => {
    const syntax = `![${asset.name}](asset:${asset.id})`;
    navigator.clipboard.writeText(syntax);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="modal-backdrop" onClick={() => dispatch(setAssetModalOpen(false))}>
      <div className="asset-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="modal-title">Markdown Image Assets</h3>
              <p className="modal-subtitle">
                Local in-memory assets (max {MAX_MARKDOWN_ASSETS} images, ≤ 2.0 MB each)
              </p>
            </div>
          </div>

          <div className="modal-header-actions">
            <span
              className={`asset-count-badge ${
                assets.length >= MAX_MARKDOWN_ASSETS ? 'full' : ''
              }`}
            >
              {assets.length} / {MAX_MARKDOWN_ASSETS} Used
            </span>
            <button
              type="button"
              className="btn-icon"
              onClick={() => dispatch(setAssetModalOpen(false))}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div
          className={`asset-dropzone ${isDragging ? 'dragging' : ''} ${
            assets.length >= MAX_MARKDOWN_ASSETS ? 'disabled' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            if (assets.length < MAX_MARKDOWN_ASSETS) {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="asset-dropzone-inner">
            <div className="dropzone-icon-circle">
              <Upload size={22} />
            </div>
            <div className="dropzone-text">
              {assets.length >= MAX_MARKDOWN_ASSETS ? (
                <span className="dropzone-full-text">
                  <AlertTriangle size={16} /> Asset gallery full (5/5). Remove an asset to upload more.
                </span>
              ) : (
                <>
                  <span className="dropzone-main-text">
                    Drop images here or <span className="highlight-text">browse files</span>
                  </span>
                  <span className="dropzone-sub-text">
                    Supports PNG, JPG, WEBP, SVG • Max 2.0 MB per image
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="asset-list-container">
          {assets.length === 0 ? (
            <div className="asset-empty-state">
              <FileImage size={36} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <p>No images uploaded yet.</p>
              <span>Upload up to 5 images to embed charts, screenshots, or signatures.</span>
            </div>
          ) : (
            <div className="asset-grid">
              {assets.map((asset) => (
                <div key={asset.id} className="asset-card">
                  <div className="asset-preview-wrap">
                    <img src={asset.dataUrl} alt={asset.name} className="asset-preview-img" />
                    <span className="asset-size-tag">{formatFileSize(asset.size)}</span>
                  </div>

                  <div className="asset-info">
                    <span className="asset-name" title={asset.name}>
                      {asset.name}
                    </span>
                    <span className="asset-syntax-code">asset:{asset.id.slice(0, 10)}...</span>
                  </div>

                  <div className="asset-card-actions">
                    <button
                      type="button"
                      className="btn-asset-insert"
                      onClick={() => handleInsert(asset)}
                      title="Insert into Markdown Editor"
                    >
                      <Plus size={14} />
                      <span>Insert</span>
                    </button>

                    <button
                      type="button"
                      className="btn-asset-icon"
                      onClick={() => handleCopySyntax(asset)}
                      title="Copy Markdown image syntax"
                    >
                      {copiedId === asset.id ? <Check size={14} style={{ color: 'var(--success-text)' }} /> : <Copy size={14} />}
                    </button>

                    <button
                      type="button"
                      className="btn-asset-icon delete"
                      onClick={() => dispatch(removeAsset(asset.id))}
                      title="Remove image from assets"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-note">
            Images are embedded in memory as base64 and export directly into your generated PDF.
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch(setAssetModalOpen(false))}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
