/**
 * In-memory registry for raw PDF Blobs and Files.
 * Storing immutable Blobs ensures:
 * 1. Every getBuffer() returns a fresh, independent ArrayBuffer.
 * 2. PDF.js Web Worker detachment can NEVER corrupt or zero-out the source document data.
 * 3. Anchoring on global window.__PDF_DATA_REGISTRY__ prevents Vite HMR from wiping uploaded files.
 */

const g = typeof window !== 'undefined' ? (window as any) : globalThis;
if (!g.__PDF_DATA_REGISTRY__) {
  g.__PDF_DATA_REGISTRY__ = new Map<string, Blob>();
}
const blobStore: Map<string, Blob> = g.__PDF_DATA_REGISTRY__;

export const setBuffer = (id: string, data: ArrayBuffer | Blob): void => {
  if (data instanceof Blob) {
    blobStore.set(id, data);
  } else {
    // Store an immutable Blob wrapping the slice
    const blob = new Blob([data.slice(0)], { type: 'application/pdf' });
    blobStore.set(id, blob);
  }
};

export const getBlob = (id: string): Blob | undefined => {
  return blobStore.get(id);
};

export const getBuffer = async (id: string): Promise<ArrayBuffer | undefined> => {
  const blob = blobStore.get(id);
  if (!blob || blob.size === 0) {
    return undefined;
  }
  return await blob.arrayBuffer();
};

export const hasBuffer = (id: string): boolean => {
  const blob = blobStore.get(id);
  return !!blob && blob.size > 0;
};

export const deleteBuffer = (id: string): void => {
  blobStore.delete(id);
};

export const clearBuffers = (): void => {
  blobStore.clear();
};
