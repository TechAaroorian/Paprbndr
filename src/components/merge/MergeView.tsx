import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { reorderDocuments } from '../../store/documentsSlice';
import { Dropzone } from '../Dropzone';
import { DocumentCard } from './DocumentCard';
import { MergeToolbar } from './MergeToolbar';

export const MergeView: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      dispatch(reorderDocuments({ fromIndex: draggedIndex, toIndex: dropIndex }));
    }
    setDraggedIndex(null);
  };

  return (
    <div className="merge-container">
      <div className="section-header">
        <div>
          <h1 className="section-title">Merge & Reorder Documents</h1>
          <p className="section-subtitle">
            Upload multiple PDF files, adjust page sequencing, remove unneeded pages, and merge into a single PDF.
          </p>
        </div>
      </div>

      <Dropzone />

      {documents.length > 0 && (
        <div className="doc-list-wrapper">
          {documents.map((doc, idx) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              index={idx}
              totalDocs={documents.length}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      <MergeToolbar />
    </div>
  );
};
