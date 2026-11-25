// Counter backend: Abacus (https://abacus.jasoncameron.dev)
// Free, no signup, CORS enabled. GET /hit increments (auto-creates), GET /get reads.
// (counterapi.dev v1 started blocking CORS from browsers — migrated 2026-07)
export class StatsManager {
    constructor() {
        this.namespace = 'traesoundeus-v2-production'; // Unique namespace for this app
        this.baseUrl = 'https://abacus.jasoncameron.dev';
        this.cache = {};             // { key: { count, ts } }
        this.cacheTTL = 60 * 1000;   // 60s: refresca contadores sin spamear la API
        this.topCacheKey = 'topTracksCache-v2';
        this.topCacheTTL = 30 * 60 * 1000; // 30 min para el ranking global
    }

    // ---------- Low-level helpers ----------

    _cacheGet(key) {
        const entry = this.cache[key];
        if (!entry) return null;
        if (Date.now() - entry.ts > this.cacheTTL) return null;
        return entry.count;
    }

    _cacheSet(key, count) {
        this.cache[key] = { count, ts: Date.now() };
    }

    async _read(key) {
        const cached = this._cacheGet(key);
        if (cached !== null) return cached;
        try {
            const res = await fetch(`${this.baseUrl}/get/${this.namespace}/${key}`);
            if (res.status === 404) {
                // Counter doesn't exist yet
                this._cacheSet(key, 0);
                return 0;
            }
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            const count = data.value || 0;
            this._cacheSet(key, count);
            return count;
        } catch (e) {
            return 0;
        }
    }

    // Abacus /hit increments by 1 and auto-creates the counter if missing
    async _bump(key) {
        try {
            const res = await fetch(`${this.baseUrl}/hit/${this.namespace}/${key}`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            const count = data.value || 0;
            this._cacheSet(key, count);
            return count;
        } catch (e) {
            console.warn(`[Stats] Failed to increment counter ${key}`, e);
            return null;
        }
    }

    // ---------- Visitors ----------

    async getVisitorCount() {
        const key = 'global-visits';
        // Flag específico del backend nuevo: los visitantes de la época de
        // counterapi tienen 'hasVisited' pero deben contar una vez en Abacus.
        const visited = localStorage.getItem('hasVisitedAbacus');

        try {
            if (!visited) {
                const count = await this._bump(key);
                if (count !== null) {
                    localStorage.setItem('hasVisitedAbacus', 'true');
                    return count;
                }
                // Incremento falló (red/adblock): muestra respaldo, sin marcar
                return this.getFallbackCount();
            }

            // Visitante que ya contó: solo leer. Un número real (aunque sea
            // bajo) es mejor que el simulado — solo usamos respaldo si la
            // petición en sí falla.
            const res = await fetch(`${this.baseUrl}/get/${this.namespace}/${key}`);
            if (res.status === 404) return this.getFallbackCount(); // contador aún no existe
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            const count = data.value || 0;
            this._cacheSet(key, count);
            return count > 0 ? count : this.getFallbackCount();
        } catch (e) {
            console.error('[Stats] Error (likely AdBlocker):', e);
            return this.getFallbackCount();
        }
    }

    getFallbackCount() {
        // Returns a number based on current date to simulate activity if API is blocked
        const start = new Date('2025-01-01').getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return 50 + Math.max(0, diff);
    }

    // ---------- Play counts ----------

    async getPlayCount(trackId) {
        return this._read(`track-${trackId}`);
    }

    async incrementPlayCount(trackId) {
        const count = await this._bump(`track-${trackId}`);
        if (count !== null) {
            window.dispatchEvent(new CustomEvent('playcountupdated', {
                detail: { trackId, count }
            }));
        }
        return count;
    }

    // ---------- Global likes ----------
    // Note: Abacus has no public decrement, so the global counter is
    // "total de likes dados" (like counters on YouTube): unliking updates
    // your local favorites but doesn't lower the global number.

    async getLikeCount(trackId) {
        return this._read(`like-${trackId}`);
    }

    async incrementLikeCount(trackId) {
        const count = await this._bump(`like-${trackId}`);
        this._dispatchLike(trackId, count);
        return count;
    }

    async decrementLikeCount(trackId) {
        // No-op globally (see note above); local favorites already updated.
        return this._read(`like-${trackId}`);
    }

    _dispatchLike(trackId, count) {
        if (count === null) return;
        window.dispatchEvent(new CustomEvent('likecountupdated', {
            detail: { trackId, count }
        }));
    }

    // ---------- Top tracks (batch, throttled, cached) ----------

    /**
     * Fetch play counts for a list of { trackId, ... } items.
     * Uses a localStorage cache (30 min TTL) so the ranking doesn't
     * hammer the API on every visit. onProgress(done, total) is optional.
     */
    async getTopCounts(trackIds, onProgress = null) {
        // Try localStorage cache first
        try {
            const raw = localStorage.getItem(this.topCacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Date.now() - parsed.ts < this.topCacheTTL && parsed.counts) {
                    return parsed.counts;
                }
            }
        } catch (e) { /* corrupt cache, ignore */ }

        const counts = {};
        const CONCURRENCY = 8;
        let done = 0;
        const queue = [...trackIds];

        const worker = async () => {
            while (queue.length > 0) {
                const id = queue.shift();
                counts[id] = await this._read(`track-${id}`);
                done++;
                if (onProgress) onProgress(done, trackIds.length);
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, trackIds.length) }, worker)
        );

        try {
            localStorage.setItem(this.topCacheKey, JSON.stringify({ ts: Date.now(), counts }));
        } catch (e) { /* storage full, ignore */ }

        return counts;
    }

    invalidateTopCache() {
        try { localStorage.removeItem(this.topCacheKey); } catch (e) { /* ignore */ }
    }

    // Helper to format large numbers (e.g. 1.2k)
    formatCount(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }
}
