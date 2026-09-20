import React, { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setComparisonDocs } from '../../store/diffSlice';
import { addDocuments } from '../../store/documentsSlice';
import { createContractDiffPair, parsePdfFile } from '../../services/pdfService';
import { setNotification } from '../../store/uiSlice';
import { DiffToolbar } from './DiffToolbar';
import { SwipeComparator } from './SwipeComparator';
import { OverlayDiffCanvas } from './OverlayDiffCanvas';
import { SideBySideView } from './SideBySideView';
import { GitCompare, Sparkles, FilePlus } from 'lucide-react';

export const DiffView: React.FC = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documents = useAppSelector((state) => state.documents.items);
  const {
    docAId,
    docBId,
    pageA,
    pageB,
    diffMode,
    zoom,
  } = useAppSelector((state) => state.diff);

  const docA = documents.find((d) => d.id === docAId);
  const docB = documents.find((d) => d.id === docBId);

  const handleLoadContractDiff = async () => {
    try {
      const [itemA, itemB] = await createContractDiffPair();
      dispatch(addDocuments([itemA, itemB]));
      dispatch(setComparisonDocs({ docAId: itemA.id, docBId: itemB.id }));
      dispatch(
        setNotification({
          type: 'success',
          message: 'Loaded contract revisions (v1.0 vs v2.1) ready for visual diff.',
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length === 0) return;

      const parsedDocs = await Promise.all(pdfFiles.map((f) => parsePdfFile(f)));
      dispatch(addDocuments(parsedDocs));

      if (parsedDocs.length >= 2) {
        dispatch(setComparisonDocs({ docAId: parsedDocs[0].id, docBId: parsedDocs[1].id }));
      } else if (parsedDocs.length === 1) {
        if (!docAId) {
          dispatch(setComparisonDocs({ docAId: parsedDocs[0].id, docBId: docBId || '' }));
        } else if (!docBId) {
          dispatch(setComparisonDocs({ docAId: docAId, docBId: parsedDocs[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // If both documents are not yet selected
  if (!docA || !docB) {
    return (
      <div className="diff-empty-container">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={handleUploadFiles}
        />

        <div className="diff-empty-card">
          <div className="diff-empty-icon-box">
            <GitCompare size={32} />
          </div>

          <h2 className="diff-empty-title">Visual Document Diff & Comparator</h2>
          <p className="diff-empty-subtitle">
            Compare two versions of a document (e.g., contracts, drawings, agreements) with an interactive swipe divider, color delta heatmap, or synchronized view.
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleLoadContractDiff}
            >
              <Sparkles size={16} style={{ color: '#d97706' }} />
              <span>Try Sample Contract Diff (v1 vs v2)</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <FilePlus size={16} />
              <span>Upload PDF Files to Compare</span>
            </button>
          </div>

          {documents.length >= 2 && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Or select from already loaded documents:
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  dispatch(
                    setComparisonDocs({
                      docAId: documents[0].id,
                      docBId: documents[1].id,
                    })
                  )
                }
              >
                <span>Compare "{documents[0].name}" vs "{documents[1].name}"</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="diff-layout">
      <DiffToolbar />

      <div className="diff-content-area">
        {diffMode === 'swipe' && (
          <SwipeComparator
            docAId={docA.id}
            docBId={docB.id}
            pageA={pageA}
            pageB={pageB}
            zoom={zoom}
          />
        )}

        {diffMode === 'difference' && (
          <OverlayDiffCanvas
            docAId={docA.id}
            docBId={docB.id}
            pageA={pageA}
            pageB={pageB}
            zoom={zoom}
          />
        )}

        {diffMode === 'side-by-side' && (
          <SideBySideView
            docAId={docA.id}
            docBId={docB.id}
            pageA={pageA}
            pageB={pageB}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
};
