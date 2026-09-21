import { describe, it, expect, beforeEach } from 'vitest';
import {
  setBuffer,
  getBuffer,
  getBlob,
  hasBuffer,
  deleteBuffer,
  clearBuffers,
} from '../services/bufferRegistry';

describe('bufferRegistry - In-RAM Memory Store', () => {
  beforeEach(() => {
    clearBuffers();
  });

  it('stores and retrieves ArrayBuffers correctly', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    setBuffer('doc_1', data.buffer);

    expect(hasBuffer('doc_1')).toBe(true);
    const retrieved = await getBuffer('doc_1');
    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(new Uint8Array(retrieved)).toEqual(data);
    }
  });

  it('stores and retrieves Blobs correctly', async () => {
    const text = 'Paprbndr Client Memory Bridge';
    const blob = new Blob([text], { type: 'text/plain' });
    setBuffer('doc_blob', blob);

    expect(hasBuffer('doc_blob')).toBe(true);
    const retrievedBlob = getBlob('doc_blob');
    expect(retrievedBlob).toBeDefined();
    expect(retrievedBlob?.size).toBe(blob.size);

    const buffer = await getBuffer('doc_blob');
    expect(buffer).toBeDefined();
  });

  it('returns undefined for non-existent document IDs', async () => {
    expect(hasBuffer('missing_id')).toBe(false);
    expect(await getBuffer('missing_id')).toBeUndefined();
    expect(getBlob('missing_id')).toBeUndefined();
  });

  it('deletes specific buffers on deleteBuffer', () => {
    const data = new Uint8Array([10, 20, 30]);
    setBuffer('doc_del', data.buffer);
    expect(hasBuffer('doc_del')).toBe(true);

    deleteBuffer('doc_del');
    expect(hasBuffer('doc_del')).toBe(false);
  });

  it('clears all registered buffers on clearBuffers', () => {
    setBuffer('doc_a', new Uint8Array([1]).buffer);
    setBuffer('doc_b', new Uint8Array([2]).buffer);
    expect(hasBuffer('doc_a')).toBe(true);
    expect(hasBuffer('doc_b')).toBe(true);

    clearBuffers();
    expect(hasBuffer('doc_a')).toBe(false);
    expect(hasBuffer('doc_b')).toBe(false);
  });
});
