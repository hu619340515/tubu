import { ParsedTrack } from '../types/track';
import { trackParserService } from './trackParserService';

const TRACK_PREFIX = 'hike_track_';
const TRACK_CLEARED_PREFIX = 'hike_track_cleared_';

export const trackStorageService = {
  /**
   * Get track for a specific list/route.
   * Returns null if no track has been imported.
   */
  async getTrack(
    listId: string,
    listTitle?: string,
    destination?: string
  ): Promise<ParsedTrack | null> {
    if (!listId) return null;

    // 1. Check local cache
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const isCleared = localStorage.getItem(TRACK_CLEARED_PREFIX + listId) === 'true';
        if (isCleared) return null;

        const raw = localStorage.getItem(TRACK_PREFIX + listId);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.allPoints) && parsed.allPoints.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[TrackStorage] Read from localStorage failed:', e);
    }

    // 2. Check server
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const res = await fetch(`/api/track/${encodeURIComponent(listId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.allPoints) && data.allPoints.length > 0) {
            try {
              localStorage.setItem(TRACK_PREFIX + listId, JSON.stringify(data));
            } catch (e) {}
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('[TrackStorage] Fetch from server failed:', e);
    }

    // 3. Fallback: ONLY for Genye routes that haven't been cleared, load built-in Genye demo track
    const titleLower = (listTitle || '').toLowerCase();
    const destLower = (destination || '').toLowerCase();
    const isGenye = titleLower.includes('格聂') || destLower.includes('格聂');

    if (isGenye) {
      try {
        const isCleared =
          typeof window !== 'undefined' &&
          localStorage.getItem(TRACK_CLEARED_PREFIX + listId) === 'true';
        if (!isCleared) {
          const genyeTrack = await trackParserService.loadBuiltinGenyeTrack();
          if (genyeTrack) {
            this.saveTrack(listId, genyeTrack).catch(() => {});
            return genyeTrack;
          }
        }
      } catch (e) {
        console.warn('[TrackStorage] Failed to load builtin Genye track:', e);
      }
    }

    // For all other routes (not Genye), return null so the "Add Track" button is shown
    return null;
  },

  /**
   * Save track for a specific list/route
   */
  async saveTrack(listId: string, track: ParsedTrack): Promise<void> {
    if (!listId || !track) return;

    // 1. Local Storage
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(TRACK_PREFIX + listId, JSON.stringify(track));
        localStorage.removeItem(TRACK_CLEARED_PREFIX + listId);
      }
    } catch (e) {
      console.warn('[TrackStorage] Failed to write localStorage:', e);
    }

    // 2. Cloud Server Sync
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        await fetch(`/api/track/${encodeURIComponent(listId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track }),
        });
      }
    } catch (e) {
      console.warn('[TrackStorage] Failed to sync track to server:', e);
    }
  },

  /**
   * Delete/clear track for a specific list/route
   */
  async deleteTrack(listId: string): Promise<void> {
    if (!listId) return;

    // 1. Clear Local Storage
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(TRACK_PREFIX + listId);
        localStorage.setItem(TRACK_CLEARED_PREFIX + listId, 'true');
      }
    } catch (e) {
      console.warn('[TrackStorage] Failed to clear localStorage:', e);
    }

    // 2. Clear on Cloud Server
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        await fetch(`/api/track/${encodeURIComponent(listId)}`, {
          method: 'DELETE',
        });
      }
    } catch (e) {
      console.warn('[TrackStorage] Failed to delete track on server:', e);
    }
  },
};
