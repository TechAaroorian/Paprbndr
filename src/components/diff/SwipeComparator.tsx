import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSwipePercent } from '../../store/diffSlice';
import { getBuffer } from '../../services/bufferRegistry';

interface SwipeComparatorProps {
  docAId: string;
  docBId: string;
  pageA: number;
  pageB: number;
  zoom: number;
}

export const SwipeComparator: React.FC<SwipeComparatorProps> = ({
  docAId,
  docBId,
  pageA,
  pageB,
  zoom,
}) => {
  const dispatch = useAppDispatch();
  const swipePercent = useAppSelector((state) => state.diff.swipePercent);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  const [pdfA, setPdfA] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfB, setPdfB] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Load PDF A
  useEffect(() => {
    let isCancelled = false;
    getBuffer(docAId).then((buf) => {
      if (!isCancelled && buf) {
        pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then((doc) => {
          if (!isCancelled) setPdfA(doc);
        });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [docAId]);

  // Load PDF B
  useEffect(() => {
    let isCancelled = false;
    getBuffer(docBId).then((buf) => {
      if (!isCancelled && buf) {
        pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then((doc) => {
          if (!isCancelled) setPdfB(doc);
        });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [docBId]);

  // Render Page A and Page B to their respective canvases
  useEffect(() => {
    let isCancelled = false;

    const renderPages = async () => {
      if (!pdfA || !pdfB || !canvasARef.current || !canvasBRef.current) return;

      try {
        const pA = await pdfA.getPage(Math.min(pageA, pdfA.numPages));
        const pB = await pdfB.getPage(Math.min(pageB, pdfB.numPages));
        if (isCancelled) return;

        const viewportA = pA.getViewport({ scale: zoom });
        const viewportB = pB.getViewport({ scale: zoom });

        const maxWidth = Math.max(viewportA.width, viewportB.width);
        const maxHeight = Math.max(viewportA.height, viewportB.height);

        setPageDims({ width: Math.floor(maxWidth), height: Math.floor(maxHeight) });

        const dpr = window.devicePixelRatio || 1;

        // Render A
        const canvasA = canvasARef.current;
        const ctxA = canvasA.getContext('2d');
        if (ctxA) {
          canvasA.width = Math.floor(maxWidth * dpr);
          canvasA.height = Math.floor(maxHeight * dpr);
          canvasA.style.width = `${Math.floor(maxWidth)}px`;
          canvasA.style.height = `${Math.floor(maxHeight)}px`;
          await pA.render({
            canvasContext: ctxA,
            viewport: viewportA,
            canvas: canvasA,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
        }

        // Render B
        const canvasB = canvasBRef.current;
        const ctxB = canvasB.getContext('2d');
        if (ctxB) {
          canvasB.width = Math.floor(maxWidth * dpr);
          canvasB.height = Math.floor(maxHeight * dpr);
          canvasB.style.width = `${Math.floor(maxWidth)}px`;
          canvasB.style.height = `${Math.floor(maxHeight)}px`;
          await pB.render({
            canvasContext: ctxB,
            viewport: viewportB,
            canvas: canvasB,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
        }
      } catch (err) {
        console.error('Render diff pages error', err);
      }
    };

    renderPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfA, pdfB, pageA, pageB, zoom]);

  // Dragging slider calculations
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    dispatch(setSwipePercent(Math.round(pct)));
  }, [dispatch]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div className="diff-stage-viewport">
      <div
        ref={containerRef}
        className="swipe-comparator-container"
        style={{
          width: pageDims.width ? `${pageDims.width}px` : 'auto',
          height: pageDims.height ? `${pageDims.height}px` : 'auto',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Layer B (Background / Revised) */}
        <div className="swipe-layer-b">
          <canvas ref={canvasBRef} />
          <div className="swipe-tag tag-b">Document B (Revised)</div>
        </div>

        {/* Layer A (Foreground / Original, clipped by swipe percent) */}
        <div
          className="swipe-layer-a"
          style={{
            clipPath: `inset(0 ${100 - swipePercent}% 0 0)`,
          }}
        >
          <canvas ref={canvasARef} />
          <div className="swipe-tag tag-a">Document A (Original)</div>
        </div>

        {/* Vertical Divider Slider Handle */}
        <div
          className="swipe-divider-line"
          style={{ left: `${swipePercent}%` }}
        >
          <div className="swipe-handle-grip" title="Drag to peel between Document A and B">
            <span>‹</span>
            <span>›</span>
          </div>
        </div>
      </div>
    </div>
  );
};
