import { albumConfigs, albumTracks } from './data.js?v=5';

// Helper to format duration
export function formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function avg(arr, a, b) {
    let s = 0; for (let i = a; i < b; i++) s += arr[i];
    return s / Math.max(1, (b - a));
}

export class AudioManager {
    constructor({ fftSize = 2048, statsManager = null }) {
        this.audioEl = document.getElementById('audio');
        this.statsManager = statsManager;
        this.context = null;
        this.analyser = null;
        this.gain = null;
        this.fftSize = fftSize;
        this.freqArray = null;
        this.currentAlbum = 'Gracias';
        this.index = 0;
        this.queue = [];
        this.playbackMode = 'normal';
        this.favorites = this._loadStored('favorites', []);
        this.playlists = this._loadStored('playlists', {});
        this.history = this._loadStored('history', []); // Track last 50 played songs
        this.historyCursor = 0; // 0 = current, 1 = previous

        // Play-count rule: a play only counts after PLAY_COUNT_THRESHOLD
        // seconds of actual listening (like Spotify's 30s rule).
        this.PLAY_COUNT_THRESHOLD = 30; // seconds
        this._listenSeconds = 0;        // accumulated listened time for current track
        this._lastTimePos = null;       // last observed currentTime (to detect seeks)
        this._playCounted = false;      // whether current load already counted

        this.equalizer = {
            lowGain: null,
            midGain: null,
            highGain: null,
            enabled: false,
            presets: {
                normal: { low: 0, mid: 0, high: 0 },
                bass: { low: 6, mid: 0, high: -2 },
                vocal: { low: -2, mid: 3, high: 1 },
                bright: { low: -3, mid: 0, high: 4 },
                dance: { low: 4, mid: -1, high: 2 }
            }
        };

        this.volumeNormalization = {
            enabled: true,
            targetLevel: -14,
            maxGain: 6,
            smoothing: 0.95
        };

        // User audio settings (persisted)
        this.masterVolume = this._loadStored('playerVolume', 0.5);
        this.trackVolumeOffsets = this._loadStored('trackVolumeOffsets', {}); // { trackId: dB }
        this.eqSettings = this._loadStored('eqSettings', { enabled: false, preset: 'normal', low: 0, mid: 0, high: 0 });

        this.albums = this.scanAlbums();

        if (!this.albums[this.currentAlbum]) {
            const availableAlbums = Object.keys(this.albums);
            if (availableAlbums.length > 0) {
                this.currentAlbum = availableAlbums[0];
            }
        }

        this.tracks = this.albums[this.currentAlbum]?.tracks || [];

        // Bind methods to avoid context loss
        this.updateTimeDisplay = this.updateTimeDisplay.bind(this);

        // Setup audio element event listeners
        this.audioEl.addEventListener('timeupdate', this.updateTimeDisplay);
        this.audioEl.addEventListener('timeupdate', () => this._trackListenProgress());
        this.audioEl.addEventListener('seeking', () => { this._lastTimePos = null; });

        // Media Session (lockscreen / media keys)
        this._setupMediaSession();
        this.audioEl.addEventListener('loadedmetadata', () => {
            window.dispatchEvent(new CustomEvent('durationchange', {
                detail: { duration: this.audioEl.duration }
            }));
        });
    }

    // ---------- Persistence helpers ----------

    _loadStored(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed !== null && typeof parsed === typeof fallback ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    }

    _saveStored(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`[Storage] Failed to save ${key}`, e);
        }
    }

    saveFavorites() { this._saveStored('favorites', this.favorites); }
    savePlaylists() { this._saveStored('playlists', this.playlists); }
    saveHistory() { this._saveStored('history', this.history); }

    // Stable ID for counters, derived from filename
    static trackIdFor(track) {
        let filename = track.filename;
        if (!filename && track.url) {
            try {
                filename = decodeURIComponent(track.url.split('/').pop());
            } catch (e) {
                filename = track.url.split('/').pop();
            }
        }
        return filename ? filename.replace(/[^a-zA-Z0-9]/g, '-') : null;
    }

    // ---------- Media Session (lockscreen artwork & controls) ----------

    _setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        const ms = navigator.mediaSession;

        const safe = (action, handler) => {
            try { ms.setActionHandler(action, handler); } catch (e) { /* unsupported action */ }
        };

        safe('play', () => this.play());
        safe('pause', () => this.pause());
        safe('previoustrack', () => {
            if (this.playbackMode === 'infinite_random' && this.history.length > 1) {
                this.prevHistory();
            } else {
                this.prev();
            }
        });
        safe('nexttrack', () => this.next());
        safe('seekto', (details) => {
            if (details.seekTime != null && isFinite(this.audioEl.duration)) {
                this.audioEl.currentTime = details.seekTime;
            }
        });
        safe('seekbackward', (details) => {
            this.audioEl.currentTime = Math.max(0, this.audioEl.currentTime - (details.seekOffset || 10));
        });
        safe('seekforward', (details) => {
            const dur = this.audioEl.duration;
            if (isFinite(dur)) this.audioEl.currentTime = Math.min(dur, this.audioEl.currentTime + (details.seekOffset || 10));
        });

        // Keep playbackState + position in sync
        this.audioEl.addEventListener('play', () => { ms.playbackState = 'playing'; });
        this.audioEl.addEventListener('pause', () => { ms.playbackState = 'paused'; });
        this.audioEl.addEventListener('timeupdate', () => this._updateMediaPosition());
        this.audioEl.addEventListener('durationchange', () => this._updateMediaPosition());
        this.audioEl.addEventListener('ratechange', () => this._updateMediaPosition());
    }

    _updateMediaPosition() {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
        const dur = this.audioEl.duration;
        if (!isFinite(dur) || dur <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: this.audioEl.playbackRate || 1,
                position: Math.min(this.audioEl.currentTime, dur)
            });
        } catch (e) { /* invalid state, ignore */ }
    }

    // Find the first cover candidate that actually loads (cached per album)
    _resolveCover(album) {
        if (!album) return Promise.resolve(null);
        if (album._resolvedCover !== undefined) return Promise.resolve(album._resolvedCover);

        const candidates = album.covers || (album.cover ? [album.cover] : []);
        const tryLoad = (i) => new Promise(resolve => {
            if (i >= candidates.length) return resolve(null);
            const img = new Image();
            img.onload = () => resolve(candidates[i]);
            img.onerror = () => tryLoad(i + 1).then(resolve);
            img.src = candidates[i];
        });

        return tryLoad(0).then(url => {
            album._resolvedCover = url;
            return url;
        });
    }

    _updateMediaSessionMetadata(track, album) {
        if (!('mediaSession' in navigator)) return;

        const setMeta = (artworkUrl) => {
            const artwork = artworkUrl ? [
                { src: new URL(artworkUrl, window.location.href).href, sizes: '512x512', type: 'image/png' }
            ] : [];
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title || '',
                    artist: album?.artist || 'Nous Deus',
                    album: album?.title || '',
                    artwork
                });
            } catch (e) { /* ignore */ }
        };

        // Set immediately without artwork, then refine once the cover resolves
        setMeta(null);
        this._resolveCover(album).then(url => {
            // Only update if this track is still the current one
            const current = this.tracks[this.index];
            if (url && current && current.url === track.url) setMeta(url);
        });
    }

    // ---------- Play-count tracking (30s rule) ----------

    _trackListenProgress() {
        if (this._playCounted || !this.statsManager) return;
        if (this.audioEl.paused) { this._lastTimePos = null; return; }

        const pos = this.audioEl.currentTime;
        if (this._lastTimePos !== null) {
            const delta = pos - this._lastTimePos;
            // Only accumulate small forward steps (normal playback).
            // Seeks/jumps produce large or negative deltas and are ignored.
            if (delta > 0 && delta < 2) {
                this._listenSeconds += delta;
            }
        }
        this._lastTimePos = pos;

        // Short tracks: count at half duration instead of a full 30s
        const duration = this.audioEl.duration;
        const threshold = (duration && isFinite(duration))
            ? Math.min(this.PLAY_COUNT_THRESHOLD, duration / 2)
            : this.PLAY_COUNT_THRESHOLD;

        if (this._listenSeconds >= threshold) {
            this._playCounted = true;
            const track = this.tracks[this.index];
            const trackId = track ? AudioManager.trackIdFor(track) : null;
            if (trackId) this.statsManager.incrementPlayCount(trackId);
        }
    }

    scanAlbums() {
        const albums = {};

        albumConfigs.forEach(config => {
            const folder = config.folder || `Nous Deus - ${config.number}`;
            const basePath = `./assets/albums/${folder}`;
            const tracksList = albumTracks[basePath] || [];

            const tracks = tracksList.map(track => ({
                title: track.title,
                filename: track.filename,
                url: `${basePath}/${encodeURIComponent(track.filename)}`,
                gain: typeof track.gain === 'number' ? track.gain : null
            }));

            if (tracks.length > 0) {
                // Extract year and optional name from folder
                // Folder names are like "2005 (Nous Deus I)" or "2006"
                const yearMatch = folder.match(/^(\d{4})/);
                const parenMatch = folder.match(/\(([^)]+)\)/);

                const year = yearMatch ? yearMatch[1] : '';
                const albumName = parenMatch ? parenMatch[1] : null;

                // Build title: "Year (Name)" or just "Year"
                let albumTitle;
                if (albumName) {
                    albumTitle = `${year} (${albumName})`;
                } else {
                    albumTitle = year;
                }

                // Detect cover images - extract year from folder name
                // Folder names are like "2005 (Nous Deus I)" or "2006"
                const coverYearMatch = folder.match(/^(\d{4})/);
                const covers = [];

                if (coverYearMatch) {
                    const fullYear = coverYearMatch[1]; // e.g., "2005"
                    const shortYear = fullYear.slice(-2); // e.g., "05"

                    // Try different cover naming patterns
                    covers.push(`${basePath}/${shortYear}.png`);      // e.g., "05.png"
                    covers.push(`${basePath}/${shortYear}.1.png`);    // e.g., "05.1.png"
                    covers.push(`${basePath}/${fullYear}.png`);       // e.g., "2005.png"
                    covers.push(`${basePath}/${fullYear}.1.png`);     // e.g., "2005.1.png"
                }

                // Fallback to cover.png
                covers.push(`${basePath}/cover.png`);

                albums[config.key] = {
                    key: config.key,
                    title: albumTitle,
                    artist: config.artist,
                    cover: covers[0],
                    covers: covers,
                    basePath,
                    tracks: tracks,
                    year: year
                };
            }
        });

        return albums;
    }

    async init() {
        if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        if (!this.analyser) {
            const src = this.context.createMediaElementSource(this.audioEl);

            this.equalizer.lowGain = this.context.createGain();
            this.equalizer.midGain = this.context.createGain();
            this.equalizer.highGain = this.context.createGain();

            const lowFilter = this.context.createBiquadFilter();
            lowFilter.type = 'lowshelf';
            lowFilter.frequency.value = 320;
            lowFilter.gain.value = 0;

            const midFilter = this.context.createBiquadFilter();
            midFilter.type = 'peaking';
            midFilter.frequency.value = 1000;
            midFilter.Q.value = 0.5;
            midFilter.gain.value = 0;

            const highFilter = this.context.createBiquadFilter();
            highFilter.type = 'highshelf';
            highFilter.frequency.value = 3200;
            highFilter.gain.value = 0;

            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.gain = this.context.createGain();
            this.gain.gain.value = Math.max(0, Math.min(1, this.masterVolume)); // Restore saved volume

            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            // Per-track normalization gain (set from LUFS analysis in data.js)
            this.normGain = this.context.createGain();
            this.normGain.gain.value = 1;

            src.connect(lowFilter);
            lowFilter.connect(midFilter);
            midFilter.connect(highFilter);
            highFilter.connect(this.normGain);
            this.normGain.connect(this.compressor);
            this.compressor.connect(this.analyser);
            this.analyser.connect(this.gain);
            this.gain.connect(this.context.destination);

            this.equalizer.lowFilter = lowFilter;
            this.equalizer.midFilter = midFilter;
            this.equalizer.highFilter = highFilter;

            // Restore saved EQ settings
            if (this.eqSettings.enabled) {
                this.equalizer.enabled = true;
                this.setEqualizerBand('low', this.eqSettings.low);
                this.setEqualizerBand('mid', this.eqSettings.mid);
                this.setEqualizerBand('high', this.eqSettings.high);
            }
        }
    }

    load(index) {
        this.index = (index + this.tracks.length) % this.tracks.length;
        let track = this.tracks[this.index];

        // Reset play-count tracking for the new track.
        // The count now happens in _trackListenProgress() after 30s listened.
        this._listenSeconds = 0;
        this._lastTimePos = null;
        this._playCounted = false;

        this.audioEl.src = track.url;
        this.audioEl.load();

        // Apply per-track loudness normalization
        this._applyTrackGain(track);

        // Add to history (limit to 50 tracks)
        const currentAlbum = this.getCurrentAlbum();
        const historyTrack = {
            title: track.title,
            filename: track.filename,
            url: track.url,
            artist: track.album?.artist || currentAlbum?.artist || 'Unknown',
            albumTitle: track.album?.title || currentAlbum?.title || '',
            cover: track.album?.cover || currentAlbum?.cover || '',
            albumKey: this.currentAlbum || '',
            playedAt: new Date().toISOString()
        };

        // Remove duplicates and add to beginning
        this.history = this.history.filter(t => t.url !== track.url);
        this.history.unshift(historyTrack);
        this.historyCursor = 0;

        // Limit to 50 tracks
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
        this.saveHistory();

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('trackchange', { detail: { track, album: this.getCurrentAlbum() } }));

        // Lockscreen / media keys metadata
        this._updateMediaSessionMetadata(track, this.getCurrentAlbum() || {
            artist: historyTrack.artist, title: historyTrack.albumTitle, cover: historyTrack.cover, covers: historyTrack.cover ? [historyTrack.cover] : []
        });

        this.audioEl.addEventListener('loadedmetadata', () => {
            track.duration = this.audioEl.duration;
            window.dispatchEvent(new CustomEvent('durationchange', { detail: { duration: this.audioEl.duration } }));
        }, { once: true });

        // Ensure we handle the end of the track to play the next one
        this.audioEl.onended = () => {
            this.next();
        };
    }

    // Optimized preloading: Load metadata only when needed or in small batches
    preloadTrackDurations() {
        // Intentionally left empty or minimal to avoid freezing
    }

    play() {
        this.init().then(() => {
            const p = this.audioEl.play();
            if (p && typeof p.then === 'function') {
                p.catch((e) => {
                    if (e.name !== 'AbortError') {
                        console.warn('Play error:', e);
                        console.error('Failed to load source:', this.audioEl.src);
                        // If error (likely 404 or format), try next track if in random mode
                        if (this.playbackMode === 'infinite_random') {
                            console.log('Skipping to next random track due to error');
                            setTimeout(() => this.playRandom(), 500);
                        }
                    }
                });
            }
        });
    }

    pause() { this.audioEl.pause(); }

    setVolume(v) {
        this.masterVolume = Math.max(0, Math.min(1, v));
        if (this.gain) this.gain.gain.value = this.masterVolume;
        this._saveStored('playerVolume', this.masterVolume);
    }

    getVolume() {
        return this.masterVolume;
    }

    // ---------- Per-track user volume offset (dB, persisted) ----------

    getTrackVolumeOffset(track) {
        const id = AudioManager.trackIdFor(track || this.tracks[this.index]);
        if (!id) return 0;
        const db = this.trackVolumeOffsets[id];
        return typeof db === 'number' && isFinite(db) ? db : 0;
    }

    setTrackVolumeOffset(track, db) {
        const target = track || this.tracks[this.index];
        const id = AudioManager.trackIdFor(target);
        if (!id) return;
        db = Math.max(-12, Math.min(12, db));
        if (db === 0) {
            delete this.trackVolumeOffsets[id];
        } else {
            this.trackVolumeOffsets[id] = db;
        }
        this._saveStored('trackVolumeOffsets', this.trackVolumeOffsets);

        // Re-apply live if it's the current track
        const current = this.tracks[this.index];
        if (current && AudioManager.trackIdFor(current) === id) {
            this._applyTrackGain(current);
        }
    }

    updateTimeDisplay() {
        const currentTime = this.audioEl.currentTime;
        const duration = this.audioEl.duration;
        window.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime, duration } }));
    }

    hasDeepLink() {
        const params = new URLSearchParams(window.location.search);
        return params.has('track');
    }

    playDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const trackName = params.get('track');
        if (!trackName) return;

        // Find track in all albums
        for (const [albumKey, album] of Object.entries(this.albums)) {
            const index = album.tracks.findIndex(t => t.filename === trackName);
            if (index !== -1) {
                this.currentAlbum = albumKey;
                this.tracks = album.tracks;
                this.index = index;
                this.load(index);
                this.play();
                return;
            }
        }
        // Fallback
        this.playRandom();
    }

    // New method for infinite random playback
    playRandom() {
        this.playbackMode = 'infinite_random';
        const allTracks = [];
        // Aggregate all tracks from all albums
        Object.values(this.albums).forEach(album => {
            if (album.tracks) {
                album.tracks.forEach(t => {
                    allTracks.push({ ...t, album });
                });
            }
        });

        if (allTracks.length === 0) return;

        const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];

        // Switch to that album context
        this.currentAlbum = Object.keys(this.albums).find(key => this.albums[key] === randomTrack.album);
        this.tracks = randomTrack.album.tracks;
        this.index = this.tracks.findIndex(t => t.url === randomTrack.url);

        this.load(this.index);
        this.play();
    }

    setEqualizerBand(band, value) {
        if (!this.equalizer.enabled || !this.equalizer[band + 'Filter']) return;
        const gainValue = Math.max(-12, Math.min(12, value));
        this.equalizer[band + 'Filter'].gain.value = gainValue;
    }

    setEqualizerPreset(presetName) {
        const preset = this.equalizer.presets[presetName];
        if (!preset) return;
        this.setEqualizerBand('low', preset.low);
        this.setEqualizerBand('mid', preset.mid);
        this.setEqualizerBand('high', preset.high);
    }

    toggleEqualizer(enabled) {
        this.equalizer.enabled = enabled;
        if (!enabled) {
            this.setEqualizerBand('low', 0);
            this.setEqualizerBand('mid', 0);
            this.setEqualizerBand('high', 0);
        }
    }

    applyEQPreset(presetName) {
        const preset = this.equalizer.presets[presetName];
        if (!preset) return;

        // Enable equalizer if not already enabled
        if (!this.equalizer.enabled) {
            this.equalizer.enabled = true;
        }

        this.setEqualizerBand('low', preset.low);
        this.setEqualizerBand('mid', preset.mid);
        this.setEqualizerBand('high', preset.high);

        // Persist
        this.eqSettings = { enabled: presetName !== 'normal', preset: presetName, low: preset.low, mid: preset.mid, high: preset.high };
        this._saveStored('eqSettings', this.eqSettings);
    }

    setCustomEQ(values) {
        // values is an array [low, mid, high]
        if (!this.equalizer.enabled) {
            this.equalizer.enabled = true;
        }

        const low = parseFloat(values[0]) || 0;
        const mid = parseFloat(values[1]) || 0;
        const high = parseFloat(values[2]) || 0;

        this.setEqualizerBand('low', low);
        this.setEqualizerBand('mid', mid);
        this.setEqualizerBand('high', high);

        // Persist as custom
        this.eqSettings = { enabled: true, preset: 'custom', low, mid, high };
        this._saveStored('eqSettings', this.eqSettings);
    }

    // Set the normalization gain for a track based on its measured LUFS.
    // gain (dB) comes from generate-data.js; boost is capped at +9 dB
    // (cuts are unlimited — lowering volume can't clip).
    _applyTrackGain(track) {
        if (!this.normGain || !this.context) return;
        let db = 0;
        if (this.volumeNormalization.enabled && typeof track?.gain === 'number' && isFinite(track.gain)) {
            db = Math.min(9, track.gain);
        }
        // Add the user's manual per-track adjustment
        if (track) db += this.getTrackVolumeOffset(track);
        db = Math.max(-24, Math.min(15, db));
        const linear = Math.pow(10, db / 20);
        // Smooth 50ms ramp to avoid clicks between tracks
        try {
            this.normGain.gain.setTargetAtTime(linear, this.context.currentTime, 0.05);
        } catch (e) {
            this.normGain.gain.value = linear;
        }
    }

    toggleVolumeNormalization(enabled) {
        this.volumeNormalization.enabled = enabled;
        // Re-apply (or reset) gain for the current track
        this._applyTrackGain(enabled ? this.tracks[this.index] : null);
        if (this.compressor) {
            if (enabled) {
                this.compressor.threshold.value = -24;
                this.compressor.knee.value = 30;
                this.compressor.ratio.value = 12;
            } else {
                this.compressor.threshold.value = 0;
                this.compressor.knee.value = 0;
                this.compressor.ratio.value = 1;
            }
        }
    }

    next() {
        // Explicit queue always has priority, regardless of mode
        if (this.queue.length > 0) {
            this.playQueuedTrack();
            return;
        }
        if (this.playbackMode === 'infinite_random') {
            this.playRandom();
        } else {
            this.load(this.getNextIndex());
            this.play();
        }
    }

    prev() { this.load(this.index - 1); this.play(); }

    getNextIndex() {
        if (this.playbackMode === 'repeat_one') return this.index;
        if (this.playbackMode === 'shuffle') return Math.floor(Math.random() * this.tracks.length);
        const next = this.index + 1;
        if (next >= this.tracks.length) return (this.playbackMode === 'repeat_all') ? 0 : this.index;
        return next;
    }

    // ---------- Queue ----------

    addToQueue(trackOrUrl) {
        if (!trackOrUrl) return false;
        const track = typeof trackOrUrl === 'string'
            ? this.findTrackByUrl(trackOrUrl)
            : trackOrUrl;
        if (!track || !track.url) return false;
        this.queue.push(this._snapshotTrack(track));
        window.dispatchEvent(new CustomEvent('queuechange', { detail: { queue: this.queue } }));
        return true;
    }

    removeFromQueue(index) {
        if (index < 0 || index >= this.queue.length) return false;
        this.queue.splice(index, 1);
        window.dispatchEvent(new CustomEvent('queuechange', { detail: { queue: this.queue } }));
        return true;
    }

    clearQueue() {
        this.queue = [];
        window.dispatchEvent(new CustomEvent('queuechange', { detail: { queue: this.queue } }));
    }

    playQueuedTrack() {
        const queued = this.queue.shift();
        window.dispatchEvent(new CustomEvent('queuechange', { detail: { queue: this.queue } }));
        if (!queued) return;

        // Restore album context if the track belongs to a known album
        const album = queued.albumKey ? this.albums[queued.albumKey] : null;
        if (album) {
            this.currentAlbum = queued.albumKey;
            this.tracks = album.tracks;
            const idx = this.tracks.findIndex(t => t.url === queued.url);
            this.index = idx >= 0 ? idx : 0;
            this.load(this.index);
        } else {
            // Standalone track (e.g. from a playlist snapshot)
            this.tracks = [queued];
            this.index = 0;
            this.load(0);
        }
        this.play();
    }

    findTrackByUrl(url) {
        for (const album of Object.values(this.albums)) {
            const track = album.tracks.find(t => t.url === url);
            if (track) return { ...track, album };
        }
        return null;
    }

    switchAlbum(albumKey) {
        if (this.albums[albumKey]) {
            if (this.playbackMode === 'infinite_random') this.playbackMode = 'normal';
            this.currentAlbum = albumKey;
            this.tracks = this.albums[albumKey].tracks;
            this.index = 0;
            this.load(0);
        }
    }
    getCurrentAlbum() {
        return this.albums[this.currentAlbum];
    }

    loadAlbum(albumIndex, trackIndex = 0) {
        const albumKeys = Object.keys(this.albums);
        if (albumIndex >= 0 && albumIndex < albumKeys.length) {
            if (this.playbackMode === 'infinite_random') this.playbackMode = 'normal';
            const albumKey = albumKeys[albumIndex];
            this.currentAlbum = albumKey;
            this.tracks = this.albums[albumKey].tracks;
            this.index = trackIndex;
            this.load(trackIndex);
        }
    }

    getAlbumsList() {
        return Object.keys(this.albums).map(key => ({
            key,
            ...this.albums[key]
        }));
    }

    getFrequencyBands() {
        if (!this.analyser) return { low: 0, mid: 0, high: 0, freqArray: [] };
        this.analyser.getByteFrequencyData(this.freqArray);
        const len = this.freqArray.length;
        const i1 = Math.floor(len / 6), i2 = Math.floor(len / 2);
        const low = avg(this.freqArray, 0, i1) / 255;
        const mid = avg(this.freqArray, i1, i2) / 255;
        const high = avg(this.freqArray, i2, len) / 255;
        return { low, mid, high, freqArray: this.freqArray };
    }
    search(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        const results = [];
        Object.values(this.albums).forEach(album => {
            album.tracks.forEach(track => {
                if (track.title.toLowerCase().includes(q) || album.artist.toLowerCase().includes(q)) {
                    results.push({ ...track, album });
                }
            });
        });
        return results;
    }

    // Normalize a track object for storage in favorites/playlists/queue
    _snapshotTrack(track) {
        const album = track.album || this.getCurrentAlbum();
        return {
            title: track.title,
            filename: track.filename || null,
            url: track.url,
            gain: typeof track.gain === 'number' ? track.gain : null,
            artist: track.artist || album?.artist || 'Unknown',
            albumTitle: track.albumTitle || album?.title || '',
            cover: track.cover || album?.cover || '',
            albumKey: track.albumKey || album?.key || ''
        };
    }

    toggleFavorite(track) {
        const idx = this.favorites.findIndex(f => f.url === track.url);
        const trackId = AudioManager.trackIdFor(track);

        if (idx >= 0) {
            this.favorites.splice(idx, 1);
            if (this.statsManager && trackId) this.statsManager.decrementLikeCount(trackId);
        } else {
            this.favorites.push(this._snapshotTrack(track));
            if (this.statsManager && trackId) this.statsManager.incrementLikeCount(trackId);
        }
        this.saveFavorites();
        return idx === -1; // true if added
    }

    isFavorite(url) {
        return this.favorites.some(f => f.url === url);
    }

    // ---------- Playlists ----------

    createPlaylist(name) {
        name = (name || '').trim();
        if (!name || this.playlists[name]) return false;
        this.playlists[name] = [];
        this.savePlaylists();
        return true;
    }

    addToPlaylist(name, track) {
        if (!this.playlists[name]) return false;
        // Avoid duplicates
        if (this.playlists[name].some(t => t.url === track.url)) return false;
        this.playlists[name].push(this._snapshotTrack(track));
        this.savePlaylists();
        return true;
    }

    removeFromPlaylist(name, url) {
        if (!this.playlists[name]) return false;
        const before = this.playlists[name].length;
        this.playlists[name] = this.playlists[name].filter(t => t.url !== url);
        this.savePlaylists();
        return this.playlists[name].length < before;
    }

    deletePlaylist(name) {
        if (!(name in this.playlists)) return false;
        delete this.playlists[name];
        this.savePlaylists();
        return true;
    }

    renamePlaylist(oldName, newName) {
        newName = (newName || '').trim();
        if (!this.playlists[oldName] || !newName || this.playlists[newName]) return false;
        this.playlists[newName] = this.playlists[oldName];
        delete this.playlists[oldName];
        this.savePlaylists();
        return true;
    }

    setPlaybackMode(mode) {
        this.playbackMode = mode;
    }
    // Navigate back to the previously played track using history
    prevHistory() {
        if (this.history.length < 2) { this.prev(); return; }
        const h = this.history[1];
        const albumKey = h.albumKey;
        const album = this.albums[albumKey];
        if (!album || !album.tracks) { this.prev(); return; }
        this.currentAlbum = albumKey;
        this.tracks = album.tracks;
        const idx = this.tracks.findIndex(t => t.url === h.url);
        this.index = idx >= 0 ? idx : Math.max(0, this.index - 1);
        this.load(this.index);
        this.play();
    }
}
