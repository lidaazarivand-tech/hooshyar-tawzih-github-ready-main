// IndexedDB & Cache Storage Engine for 100% Offline Azan Audio Storage

import { AZAN_RECITERS, resolveAzanAudioUrls } from './azanAudioEngine';

const CACHE_NAME = 'azan-audio-cache-v2';
const DB_NAME = 'azan_audio_db';
const STORE_NAME = 'audio_blobs';

// Helper to open IndexedDB as reliable fallback if CacheStorage is restricted
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store blob in IndexedDB
async function saveBlobToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Fail silently without blocking UI
  }
}

// Read blob from IndexedDB
async function getBlobFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

// In-memory object URL cache to avoid re-generating blobs continuously
const objectUrlMemoryMap = new Map<string, string>();

/**
 * Check if a specific reciter's audio is already cached offline on this device
 */
export async function isAzanCached(reciterId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Check in-memory
  if (objectUrlMemoryMap.has(reciterId)) return true;

  // 2. Check CacheStorage
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(`/cached-azan-${reciterId}.mp3`);
      if (matched && matched.ok) {
        return true;
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Check IndexedDB
  try {
    const blob = await getBlobFromIndexedDB(`azan_${reciterId}`);
    if (blob && blob.size > 10000) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  return false;
}

/**
 * Fetch and permanently store audio file for offline usage
 */
export async function cacheAzanAudio(reciterId: string, customUrl?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const candidateUrls = resolveAzanAudioUrls(reciterId);
  const urlsToTry = customUrl ? [customUrl, ...candidateUrls] : candidateUrls;

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) continue;

      const rawBlob = await response.blob();
      if (rawBlob.size < 10000) continue; // Must be valid audio data

      const blob = new Blob([rawBlob], { type: 'audio/mpeg' });

      // 1. Save in CacheStorage
      if ('caches' in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cacheResponse = new Response(blob, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': blob.size.toString()
            }
          });
          await cache.put(`/cached-azan-${reciterId}.mp3`, cacheResponse);
        } catch (err) {
          // ignore
        }
      }

      // 2. Save in IndexedDB as durable offline backup
      await saveBlobToIndexedDB(`azan_${reciterId}`, blob);

      // 3. Create active Object URL
      const oldUrl = objectUrlMemoryMap.get(reciterId);
      if (oldUrl) {
        try { URL.revokeObjectURL(oldUrl); } catch (e) {}
      }

      const objectUrl = URL.createObjectURL(blob);
      objectUrlMemoryMap.set(reciterId, objectUrl);

      return objectUrl;
    } catch (err) {
      // Try next url candidate
    }
  }

  return null;
}

/**
 * Get offline Blob Object URL for a reciter if already downloaded, or null
 */
export async function getCachedAzanUrl(reciterId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Check in-memory URL
  if (objectUrlMemoryMap.has(reciterId)) {
    return objectUrlMemoryMap.get(reciterId)!;
  }

  // Check CacheStorage
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(`/cached-azan-${reciterId}.mp3`);
      if (res && res.ok) {
        const rawBlob = await res.blob();
        if (rawBlob.size > 10000) {
          const blob = new Blob([rawBlob], { type: 'audio/mpeg' });
          const objectUrl = URL.createObjectURL(blob);
          objectUrlMemoryMap.set(reciterId, objectUrl);
          return objectUrl;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Check IndexedDB
  try {
    const rawBlob = await getBlobFromIndexedDB(`azan_${reciterId}`);
    if (rawBlob && rawBlob.size > 10000) {
      const blob = new Blob([rawBlob], { type: 'audio/mpeg' });
      const objectUrl = URL.createObjectURL(blob);
      objectUrlMemoryMap.set(reciterId, objectUrl);
      return objectUrl;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

/**
 * Download all Azans for complete offline capability
 */
export async function cacheAllAzans(
  onProgress?: (current: number, total: number, reciterName: string) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  const total = AZAN_RECITERS.length;

  for (let i = 0; i < total; i++) {
    const reciter = AZAN_RECITERS[i];
    if (onProgress) {
      onProgress(i + 1, total, reciter.name);
    }

    try {
      const already = await isAzanCached(reciter.id);
      if (already) {
        success++;
      } else {
        const res = await cacheAzanAudio(reciter.id);
        if (res) {
          success++;
        } else {
          failed++;
        }
      }
    } catch (e) {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Get summary of cached audio files
 */
export async function getAzanCacheSummary(): Promise<{
  cachedCount: number;
  totalCount: number;
  cachedIds: string[];
  isFullyOffline: boolean;
}> {
  const cachedIds: string[] = [];
  for (const r of AZAN_RECITERS) {
    const cached = await isAzanCached(r.id);
    if (cached) {
      cachedIds.push(r.id);
    }
  }

  return {
    cachedCount: cachedIds.length,
    totalCount: AZAN_RECITERS.length,
    cachedIds,
    isFullyOffline: cachedIds.length === AZAN_RECITERS.length
  };
}

/**
 * Clear all cached audio files
 */
export async function clearAllAzanCache(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Revoke object URLs
  objectUrlMemoryMap.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  objectUrlMemoryMap.clear();

  // Clear CacheStorage
  if ('caches' in window) {
    try {
      await caches.delete(CACHE_NAME);
    } catch (e) {
      // ignore
    }
  }

  // Clear IndexedDB
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {
    // ignore
  }
}
