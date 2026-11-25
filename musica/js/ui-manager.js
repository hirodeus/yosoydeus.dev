import { formatDuration } from './audio-manager.js?v=5';

export class UIManager {
    constructor(audioManager, visualizerManager, statsManager = null) {
        this.audio = audioManager;
        this.viz = visualizerManager;
        this.statsManager = statsManager;
        this.elements = {};
        this._nbCounts = { plays: null, likes: null }; // counts shown in bottom bar
        this._playlistSubview = null; // {tracks, title} when inside a list's track view
        this.fallbackCover ='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="36" r="20" fill="%232ecc71"/><ellipse cx="24" cy="34" rx="6" ry="4" fill="%23111"/><ellipse cx="40" cy="34" rx="6" ry="4" fill="%23111"/><path d="M24 44c3 2 5 3 8 3s5-1 8-3" stroke="%23111" stroke-width="3" fill="none"/></svg>';
        this.initElements();
        this.bindEvents();
        this.setupGlobalListeners();
        this.loadVisitorCount();
    }

    async loadVisitorCount() {
        if (!this.elements.visitCount || !this.elements.visitNumber) return;
        
        // Show loading state or default
        // this.elements.visitNumber.textContent = '...'; 
        
        try {
            if (this.statsManager) {
                const count = await this.statsManager.getVisitorCount();
                console.log('[UI] Visitor count received:', count);
                
                if (typeof count === 'number') {
                    // Just the number, padded to 3 digits (e.g. 005, 057, 123)
                    const formattedId = String(count).padStart(3, '0');
                    this.elements.visitNumber.textContent = formattedId;
                } else {
                     // Keep default 000 or handle error visually if needed
                     console.warn('[UI] Visitor count invalid or null');
                }
            }
        } catch (err) {
            console.error('[UI] Failed to load visitor count', err);
        }
        
        // Ensure it is visible regardless of success (shows 000 if failed)
        this.elements.visitCount.style.display = 'block';
    }

    initElements() {
        // Cache DOM elements
        const ids = [
            'overlay', 'btnStart', 'ui', 'mainView', 'bottomNav',
            'searchResults', 'searchInput',
            'albumTitle', 'albumArtist', 'playerPrev', 'playerPlayPause', 'playerNext',
            'playerVolume', 'currentTime', 'totalTime', 'progressBar', 'nowPlayingCover',
            'nowPlayingTitle', 'nowPlayingMeta',
            'nowBar', 'nbCover', 'nbTitle', 'nbMeta', 'nbPlayCount', 'btnLike', 'btnMixer', 'btnPlayPause2', 'btnPrev2', 'btnNext2',
            'nbCurrent', 'nbProgress', 'nbTotal', 'nbProgressFill', 'nbProgressContainer',
            'splashCanvas', 'visitCount', 'visitNumber', 'btnShare'
        ];

        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        this.elements.navBtns = document.querySelectorAll('.nav-btn');
    }

    bindEvents() {
        // Start Button
        if (this.elements.btnStart) {
            this.elements.btnStart.addEventListener('click', () => {
                this.elements.overlay.style.opacity = '0';
                setTimeout(() => this.elements.overlay.style.display = 'none', 500);

                if (this.elements.splashCanvas) {
                    this.elements.splashCanvas.style.opacity = '0';
                    setTimeout(() => this.elements.splashCanvas.style.display = 'none', 500);
                }

                this.elements.ui.classList.remove('hidden');
                this.elements.nowBar.classList.remove('hidden');

                // Initialize Audio Context
                this.audio.init().then(() => {
                    this.viz.startVisual('landscape'); // Default visual
                    
                    if (this.audio.hasDeepLink()) {
                        this.audio.playDeepLink();
                    } else {
                        this.audio.playRandom(); // Start with random track
                    }
                    
                    this.switchMainView('home'); // Default view
                });
            });
        }

        // Playback Bar Swipe Gestures handled in setupSwipeControls()

        // Interactive Progress Bar (Seek)
        if (this.elements.nbProgressContainer) {
            const container = this.elements.nbProgressContainer;
            const seekAtClientX = (clientX) => {
                const rect = container.getBoundingClientRect();
                const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
                const percentage = offsetX / rect.width;
                const dur = this.audio.audioEl.duration;
                if (!dur || isNaN(dur) || dur <= 0) return;
                const newTime = percentage * dur;
                this.audio.audioEl.currentTime = newTime;
                this.updateProgress({ currentTime: newTime, duration: dur });
            };
            let seeking = false;
            // Click seek
            container.addEventListener('click', (e) => {
                e.stopPropagation();
                seekAtClientX(e.clientX);
            });
            // Pointer drag (mouse/touch/pen unified)
            container.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                seeking = true;
                seekAtClientX(e.clientX);
                try { container.setPointerCapture(e.pointerId); } catch(_) {}
            });
            container.addEventListener('pointermove', (e) => {
                if (!seeking) return;
                e.stopPropagation();
                seekAtClientX(e.clientX);
            });
            const endSeek = (e) => {
                if (!seeking) return;
                seeking = false;
                e.stopPropagation();
                try { container.releasePointerCapture(e.pointerId); } catch(_) {}
            };
            container.addEventListener('pointerup', endSeek);
            container.addEventListener('pointercancel', endSeek);
            container.addEventListener('pointerleave', endSeek);
            // Prevent swipe when touching progress area
            container.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
            container.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
            container.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
        }

        // Player Controls (Main UI - if visible)
        this.elements.playerPlayPause?.addEventListener('click', () => this.togglePlay());
        this.elements.playerPrev?.addEventListener('click', () => this.audio.prev());
        this.elements.playerNext?.addEventListener('click', () => this.audio.next());

        // Player Controls (Bottom Bar)
        this.elements.btnPlayPause2?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent swipe trigger
            this.togglePlay();
        });
        this.elements.btnPrev2?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.audio.playbackMode === 'infinite_random' && this.audio.history.length > 1) {
                this.audio.prevHistory();
            } else {
                this.audio.prev();
            }
        });
        this.elements.btnNext2?.addEventListener('click', (e) => { e.stopPropagation(); this.audio.next(); });
        // Audio / EQ panel
        this.elements.btnMixer?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMixerPanel();
        });

        // Prevent swipe on touch when interacting with controls
        ['btnPlayPause2','btnPrev2','btnNext2','btnLike','btnShare','btnMixer'].forEach(id => {
            this.elements[id]?.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        });

        // Bottom Navigation
        this.elements.navBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                if (view) this.switchMainView(view);
            });
        });

        // Search Input (if in a view)
        // We'll bind this dynamically or keep it if it exists in DOM

        // Favorites
        this.elements.btnShare?.addEventListener('click', (e) => {
            e.stopPropagation();
            const track = this.audio.tracks[this.audio.index];
            if (!track) return;
            
            const url = new URL(window.location.href);
            url.searchParams.set('track', track.filename);
            
            navigator.clipboard.writeText(url.toString()).then(() => {
                alert('Link copiado al portapapeles!');
            }).catch(err => {
                console.error('Error al copiar link:', err);
                prompt('Copia este link:', url.toString());
            });
        });

        this.elements.btnLike?.addEventListener('click', (e) => {
            e.stopPropagation();
            const track = this.audio.tracks[this.audio.index];
            if (!track) return;

            const isFav = this.audio.toggleFavorite(track);
            this.updateFavoriteIcon(isFav);

            // Optimistic like-count update in bottom bar (global counter only
            // grows — unlike updates your favorites but not the public count)
            if (isFav && typeof this._nbCounts.likes === 'number') {
                this._nbCounts.likes += 1;
                this._renderNbCounts();
            }

            // Refresh playlist menu if it's the active view (not a subview)
            if (this.currentView === 'playlist' && !this._playlistSubview) {
                this.renderPlaylist(this.elements.mainView);
            }
        });

        // Swipe Controls on Now Bar
        this.setupSwipeControls();

        // Prevent swipe-next/prev when horizontally scrolling long titles
        this.elements.nbTitle?.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        this.elements.nbTitle?.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
        this.elements.nbTitle?.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    }

    setupSwipeControls() {
        const el = this.elements.nowBar;
        if (!el) return;

        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let lastY = 0;
        let moving = false;

        el.addEventListener('touchstart', (e) => {
            const t = e.changedTouches[0];
            startX = lastX = t.screenX;
            startY = lastY = t.screenY;
            moving = true;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (!moving) return;
            const t = e.changedTouches[0];
            lastX = t.screenX;
            lastY = t.screenY;
        }, { passive: true });

        el.addEventListener('touchend', () => {
            if (!moving) return;
            moving = false;
            const diffX = lastX - startX;
            const diffY = lastY - startY;
            const threshold = 40;
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
                if (diffX < 0) {
                    this.audio.next();
                } else {
                    if (this.audio.playbackMode === 'infinite_random' && this.audio.history.length > 1) {
                        this.audio.prevHistory();
                    } else {
                        this.audio.prev();
                    }
                }
            }
        }, { passive: true });
    }

    handleSwipe(startX, endX) {
        const threshold = 50; // min distance
        if (startX - endX > threshold) {
            // Swipe Left -> Next
            this.audio.next();
        } else if (endX - startX > threshold) {
            // Swipe Right -> Prev
            this.audio.prev();
        }
    }

    switchMainView(viewName) {
        this.currentView = viewName;
        this._playlistSubview = null;
        this._stopVisualPreviews();

        // Update Nav Buttons
        this.elements.navBtns?.forEach(btn => {
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Clear Main View
        const container = this.elements.mainView;
        if (!container) return;
        container.innerHTML = '';
        container.onclick = null; // clear view-specific handlers (e.g. visuals close-on-outside)

        // Home = empty view: make it transparent to touches/clicks so the
        // visuals canvas underneath receives them (drag, tap, swipe).
        container.classList.toggle('has-content', viewName !== 'home');

        // Render Content
        switch (viewName) {
            case 'home':
                // Just clear container (already done above)
                break;
            case 'albums':
                this.renderAlbumsMenu(container);
                break;
            case 'playlist':
                this.renderPlaylist(container);
                break;
            case 'visuals':
                this.renderVisualsMenu(container);
                break;
            case 'search':
                this.renderSearch(container);
                break;
        }
    }

    renderAlbumsMenu(container) {
        if (!container) return;

        container.innerHTML = '';

        // Wrapper for bottom alignment
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            min-height: 100%;
        `;

        // Grid Container
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
            padding: 1rem;
            padding-bottom: 100px;
        `;

        const sortedAlbums = Object.values(this.audio.albums).sort((a, b) => {
            return a.title.localeCompare(b.title);
        });

        sortedAlbums.forEach((album, index) => {
            if (!album.tracks || album.tracks.length === 0) return;

            const originalIndex = Object.values(this.audio.albums).indexOf(album);

            const albumCard = document.createElement('div');
            albumCard.className = 'album-card';
            albumCard.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                cursor: pointer;
            `;

            // Cover
            const coverContainer = document.createElement('div');
            coverContainer.style.cssText = `
                width: 100%;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                background: #282828;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;

            const coverImg = document.createElement('img');
            coverImg.src = album.cover;
            coverImg.onerror = () => { coverImg.onerror = null; coverImg.src = this.fallbackCover; };
            coverImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            coverContainer.appendChild(coverImg);

            // Info
            const info = document.createElement('div');
            info.style.cssText = 'display: flex; flex-direction: column;';

            const title = document.createElement('div');
            title.textContent = this.extractAlbumDisplayName(album.title);
            title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

            const meta = document.createElement('div');
            meta.textContent = album.artist;
            meta.style.cssText = 'font-size: 0.8rem; color: #b3b3b3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

            info.appendChild(title);
            info.appendChild(meta);

            albumCard.appendChild(coverContainer);
            albumCard.appendChild(info);

            albumCard.onclick = () => {
                this.showAlbumTracksModal(album, originalIndex);
            };

            grid.appendChild(albumCard);
        });

        wrapper.appendChild(grid);
        container.appendChild(wrapper);
    }

    renderVisualsMenu(container) {
        if (!container) return;

        this._stopVisualPreviews();
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding: 1rem; padding-bottom: 100px; display: flex; flex-direction: column; gap: 1rem;';

        const title = document.createElement('h2');
        title.textContent = 'Visuales';
        title.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖️ Cerrar';
        closeBtn.setAttribute('aria-label', 'Cerrar menú de visuales');
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.12);
            border: none;
            padding: 0.5rem 0.8rem;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
            font-size: 0.9rem;
        `;
        closeBtn.onclick = () => this.switchMainView('home');

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        header.appendChild(title);
        header.appendChild(closeBtn);
        wrapper.appendChild(header);

        const visuals = [
            { id: 'landscape', name: 'Premium Landscape', desc: 'Horizonte synthwave reactivo', interactive: false },
            { id: 'tron', name: 'Tron Mountains', desc: 'Montañas neón con el bajo', interactive: false },
            { id: 'motherboard', name: 'Motherboard', desc: 'Circuitos con flujo de energía', interactive: false },
            { id: 'morpher', name: 'Morpher', desc: 'Geometría que muta — arrastra para girar', interactive: true },
            { id: 'particles', name: 'Enjambre', desc: 'Partículas que siguen tu dedo', interactive: true },
            { id: 'orbs', name: 'Orbes', desc: 'Agárralos y aviéntalos', interactive: true },
            { id: 'tunnel', name: 'Túnel Warp', desc: 'Tú diriges, la música acelera', interactive: true }
        ];

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1rem;
        `;

        const previews = [];

        visuals.forEach(viz => {
            const isActive = this.viz.current === viz.id;

            const card = document.createElement('div');
            card.className = 'visual-card';
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Visual ${viz.name}`);
            card.style.cssText = `
                background: rgba(255,255,255,0.06);
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.15s, box-shadow 0.15s;
                border: 2px solid ${isActive ? 'var(--primary-color)' : 'transparent'};
            `;

            // Animated preview canvas
            const canvas = document.createElement('canvas');
            canvas.width = 320; canvas.height = 180;
            canvas.style.cssText = 'width: 100%; aspect-ratio: 16/9; display: block; background: #000;';
            card.appendChild(canvas);
            previews.push({ id: viz.id, ctx: canvas.getContext('2d'), w: 320, h: 180, seed: Math.random() * 100 });

            // Info bar
            const info = document.createElement('div');
            info.style.cssText = 'padding: 0.6rem 0.7rem; display: flex; flex-direction: column; gap: 0.15rem;';
            info.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="font-weight: 600; font-size: 0.9rem; color: ${isActive ? 'var(--primary-color)' : '#fff'};">${viz.name}</span>
                    ${isActive ? '<span style="font-size: 0.65rem; background: var(--primary-color); color: #000; padding: 0.1rem 0.4rem; border-radius: 8px; font-weight: bold;">ACTIVO</span>' : ''}
                    ${viz.interactive ? '<span title="Interactivo" style="margin-left: auto; font-size: 0.8rem;">👆</span>' : ''}
                </div>
                <span style="font-size: 0.75rem; color: #b3b3b3;">${viz.desc}</span>
            `;
            card.appendChild(info);

            card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)'; };
            card.onmouseleave = () => { card.style.transform = 'none'; card.style.boxShadow = 'none'; };

            card.onclick = async (e) => {
                e.stopPropagation();
                await this.viz.startVisual(viz.id);
                this.showToast(`Visual: ${viz.name}`);
                // Close the menu so the new visual is immediately visible
                this.switchMainView('home');
            };

            grid.appendChild(card);
        });

        wrapper.appendChild(grid);
        container.appendChild(wrapper);

        // Tap/click outside the cards closes the menu
        const closeIfOutside = (e) => {
            if (e.target === container || e.target === wrapper || e.target === grid) {
                this.switchMainView('home');
            }
        };
        container.onclick = closeIfOutside;
        wrapper.onclick = closeIfOutside;

        // One shared animation loop for all previews
        const startT = performance.now();
        const loop = () => {
            const t = (performance.now() - startT) / 1000;
            previews.forEach(p => this._drawVisualPreview(p.id, p.ctx, p.w, p.h, t + p.seed));
            this._previewRaf = requestAnimationFrame(loop);
        };
        this._previewRaf = requestAnimationFrame(loop);
    }

    _stopVisualPreviews() {
        if (this._previewRaf) {
            cancelAnimationFrame(this._previewRaf);
            this._previewRaf = null;
        }
    }

    // Small 2D procedural sketches representing each visual
    _drawVisualPreview(id, ctx, w, h, t) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, w, h);

        const neon = (hue, a = 1) => `hsla(${hue}, 95%, 60%, ${a})`;

        switch (id) {
            case 'tron': {
                ctx.strokeStyle = neon(165);
                for (let row = 0; row < 5; row++) {
                    ctx.beginPath();
                    const baseY = h * 0.35 + row * 22;
                    for (let x = 0; x <= w; x += 8) {
                        const y = baseY - Math.abs(Math.sin(x * 0.02 + t * 1.2 + row)) * 40 * (1 - row * 0.12);
                        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                    }
                    ctx.globalAlpha = 1 - row * 0.16;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'motherboard': {
                ctx.strokeStyle = neon(140, 0.5);
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const y = 20 + i * 26;
                    ctx.beginPath();
                    ctx.moveTo(0, y); ctx.lineTo(w * 0.3 + i * 15, y);
                    ctx.lineTo(w * 0.3 + i * 15 + 20, y + 20); ctx.lineTo(w, y + 20);
                    ctx.stroke();
                    // glow dot traveling
                    const p = ((t * 0.35 + i * 0.17) % 1);
                    const dx = p * w;
                    const dy = dx < w * 0.3 + i * 15 ? y : y + 20;
                    ctx.fillStyle = neon(140);
                    ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.lineWidth = 1;
                break;
            }
            case 'landscape': {
                // scrolling horizon grid
                ctx.strokeStyle = neon(300, 0.8);
                const horizon = h * 0.45;
                for (let i = 0; i < 9; i++) {
                    const p = ((t * 0.25 + i / 9) % 1);
                    const y = horizon + p * p * (h - horizon);
                    ctx.globalAlpha = p;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
                ctx.globalAlpha = 0.7;
                for (let i = -4; i <= 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(w / 2 + i * 12, horizon);
                    ctx.lineTo(w / 2 + i * 70, h);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                // sun
                const g = ctx.createRadialGradient(w / 2, horizon - 20, 2, w / 2, horizon - 20, 28);
                g.addColorStop(0, neon(320)); g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.fillRect(w / 2 - 30, horizon - 50, 60, 60);
                break;
            }
            case 'morpher': {
                const cx = w / 2, cy = h / 2;
                ctx.strokeStyle = neon(165);
                const spikes = 8;
                ctx.beginPath();
                for (let i = 0; i <= spikes * 2; i++) {
                    const a = (i / (spikes * 2)) * Math.PI * 2 + t * 0.8;
                    const r = 40 + Math.sin(t * 3 + i * 1.7) * 14 + (i % 2) * 12;
                    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.closePath(); ctx.stroke();
                break;
            }
            case 'particles': {
                const tx = w / 2 + Math.sin(t * 0.9) * w * 0.28;
                const ty = h / 2 + Math.cos(t * 1.3) * h * 0.25;
                for (let i = 0; i < 26; i++) {
                    const a = i / 26 * Math.PI * 2 + t * (1.5 + (i % 5) * 0.2);
                    const r = 12 + (i % 7) * 7 + Math.sin(t * 2 + i) * 6;
                    ctx.fillStyle = neon(175 + i * 3, 0.85);
                    ctx.beginPath();
                    ctx.arc(tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.8, 2.4, 0, Math.PI * 2);
                    ctx.fill();
                }
                // cursor dot
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'orbs': {
                for (let i = 0; i < 4; i++) {
                    const bx = w * (0.2 + i * 0.2) + Math.sin(t * (1.1 + i * 0.3) + i * 2) * 20;
                    const by = h * 0.5 + Math.abs(Math.sin(t * (1.8 + i * 0.4) + i)) * -h * 0.3 + h * 0.15;
                    const r = 12 + i * 4;
                    const g = ctx.createRadialGradient(bx, by, 1, bx, by, r);
                    g.addColorStop(0, neon(i * 80, 0.9));
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = neon(i * 80);
                    ctx.beginPath(); ctx.arc(bx, by, r * 0.7, 0, Math.PI * 2); ctx.stroke();
                }
                break;
            }
            case 'tunnel': {
                const cx = w / 2 + Math.sin(t * 0.7) * 25;
                const cy = h / 2 + Math.cos(t * 0.9) * 12;
                for (let i = 0; i < 10; i++) {
                    const p = ((t * 0.5 + i / 10) % 1);
                    const r = p * p * 110 + 2;
                    ctx.strokeStyle = neon(170 + p * 120, 1 - p * 0.5);
                    ctx.lineWidth = 1 + p * 2;
                    ctx.beginPath();
                    ctx.arc(cx + (w / 2 - cx) * p, cy + (h / 2 - cy) * p, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                break;
            }
        }
    }

    renderSearch(container) {
        if (!container) return;

        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding: 1rem; display: flex; flex-direction: column; gap: 1rem;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Buscar canciones, artistas...';
        input.style.cssText = `
            width: 100%;
            padding: 1rem;
            background: #282828;
            border: none;
            border-radius: 4px;
            color: #fff;
            font-size: 1rem;
            box-sizing: border-box;
        `;

        const results = document.createElement('div');
        results.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            results.innerHTML = '';

            if (query.length < 2) return;

            let matches = [];
            Object.values(this.audio.albums).forEach((album, albumIndex) => {
                album.tracks.forEach((track, trackIndex) => {
                    if (track.title.toLowerCase().includes(query) || album.artist.toLowerCase().includes(query)) {
                        matches.push({ track, album, albumIndex, trackIndex });
                    }
                });
            });

            matches.forEach(match => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 0.8rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                `;

                const img = document.createElement('img');
                img.src = match.album.cover;
                img.style.cssText = 'width: 40px; height: 40px; border-radius: 4px; object-fit: cover;';

                const info = document.createElement('div');
                info.innerHTML = `<div style="font-weight:600;">${match.track.title}</div><div style="font-size:0.8rem; color:#b3b3b3;">${match.album.artist}</div>`;

                info.style.cssText = 'flex: 1; overflow: hidden;';
                item.appendChild(img);
                item.appendChild(info);
                item.appendChild(this._makeMenuButton({ ...match.track, album: match.album }));

                item.onclick = () => {
                    this.audio.loadAlbum(match.albumIndex, match.trackIndex);
                    this.audio.play();
                };

                results.appendChild(item);
            });
        });

        wrapper.appendChild(input);
        wrapper.appendChild(results);
        container.appendChild(wrapper);

        // Focus input
        setTimeout(() => input.focus(), 100);
    }

    setupGlobalListeners() {
        // Listen for custom events from AudioManager
        window.addEventListener('trackchange', (e) => this.updateTrackInfo(e.detail));
        window.addEventListener('timeupdate', (e) => this.updateProgress(e.detail));
        window.addEventListener('durationchange', (e) => this.updateDuration(e.detail));
        
        // Listen for play count updates
        window.addEventListener('playcountupdated', (e) => {
            const { trackId, count } = e.detail;
            this.updatePlayCounts(trackId, count);
        });

        // Listen for global like count updates
        window.addEventListener('likecountupdated', (e) => {
            const { trackId, count } = e.detail;
            const currentTrack = this.audio.tracks[this.audio.index];
            if (currentTrack && this._trackIdFor(currentTrack) === trackId) {
                this._nbCounts.likes = count;
                this._renderNbCounts();
            }
            document.querySelectorAll(`.like-count[data-track-id="${trackId}"]`)
                .forEach(el => { el.textContent = '♥ ' + this.statsManager.formatCount(count); });
        });

        // Keep queue view fresh
        window.addEventListener('queuechange', () => {
            if (this.currentView === 'playlist' && this._playlistSubview === 'queue') {
                this.renderQueueView(this.elements.mainView);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            }
            if (e.code === 'Escape') {
                this.toggleDrawer(false);
            }
        });
    }

    togglePlay() {
        if (this.audio.audioEl.paused) {
            this.audio.play();
            this.updatePlayButton(true);
        } else {
            this.audio.pause();
            this.updatePlayButton(false);
        }
    }


    updatePlayButton(isPlaying) {
        const playIcon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l10 6-10 6V2z"/></svg>';
        const pauseIcon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 2h2v12H5V2zM9 2h2v12H9V2z"/></svg>';
        const icon = isPlaying ? pauseIcon : playIcon;
        if (this.elements.playerPlayPause) this.elements.playerPlayPause.innerHTML = icon;
        if (this.elements.btnPlayPause2) this.elements.btnPlayPause2.innerHTML = icon;
    }

    updateFavoriteIcon(isFav) {
        if (!this.elements.btnLike) return;
        console.log('Updating Favorite Icon. isFav:', isFav);

        const color = '#ff0055';
        const fill = isFav ? color : 'none';
        const stroke = isFav ? color : 'currentColor';

        this.elements.btnLike.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        `;

        this.elements.btnLike.style.cssText = `color: ${isFav ? color : '#b3b3b3'} !important;`;

        if (isFav) {
            this.elements.btnLike.style.transform = 'scale(1.2)';
            setTimeout(() => this.elements.btnLike.style.transform = 'scale(1)', 200);
        }
    }

    // Stable track ID (same rule as AudioManager)
    _trackIdFor(track) {
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

    // Render "▶ plays · ♥ likes" in the bottom bar
    _renderNbCounts() {
        if (!this.elements.nbPlayCount || !this.statsManager) return;
        const parts = [];
        if (this._nbCounts.plays !== null) parts.push('▶ ' + this.statsManager.formatCount(this._nbCounts.plays));
        if (this._nbCounts.likes !== null && this._nbCounts.likes > 0) parts.push('♥ ' + this.statsManager.formatCount(this._nbCounts.likes));
        this.elements.nbPlayCount.textContent = parts.join(' · ');
    }

    updatePlayCounts(trackId, count) {
        if (!this.statsManager) return;
        const formatted = '▶ ' + this.statsManager.formatCount(count);

        // Update Bottom Bar if it matches
        if (this.audio.tracks[this.audio.index]) {
            const currentTrack = this.audio.tracks[this.audio.index];
            const currentId = this._trackIdFor(currentTrack);
            if (currentId === trackId) {
                this._nbCounts.plays = count;
                this._renderNbCounts();
            }
        }

        // Update all specific count elements in lists
        const elements = document.querySelectorAll(`.play-count[data-track-id="${trackId}"]`);
        elements.forEach(el => el.textContent = formatted);

        // Update modal elements
        const modalEl = document.getElementById(`play-count-${trackId}`);
        if (modalEl) modalEl.textContent = this.statsManager.formatCount(count);
    }

    updateTrackInfo({ track, album }) {
        // Main UI
        if (this.elements.nowPlayingTitle) this.elements.nowPlayingTitle.textContent = track.title;
        if (this.elements.nowPlayingMeta) this.elements.nowPlayingMeta.textContent = `${album.title} — ${album.artist}`;
        if (this.elements.nowPlayingCover) this.elements.nowPlayingCover.src = album.cover;
        if (this.elements.albumTitle) this.elements.albumTitle.textContent = album.title;
        if (this.elements.albumArtist) this.elements.albumArtist.textContent = album.artist;

        // Bottom Bar Logic
        this.updateScrollingText(this.elements.nbTitle, track.title);
        this.updateScrollingText(this.elements.nbMeta, `${album.title} — ${album.artist}`);

        if (this.elements.nbCover) {
            this.elements.nbCover.src = album.cover;
            this.elements.nbCover.onerror = () => {
                this.elements.nbCover.onerror = null;
                this.elements.nbCover.src = this.fallbackCover;
            };
        }

        // Fetch Play + Like Counts for Bottom Bar
        this._nbCounts = { plays: null, likes: null };
        if (this.statsManager && this.elements.nbPlayCount) {
             const trackId = this._trackIdFor(track);
             if (trackId) {
                 this.elements.nbPlayCount.textContent = '...';
                 const stillCurrent = () => {
                     const currentTrack = this.audio.tracks[this.audio.index];
                     return currentTrack && this._trackIdFor(currentTrack) === trackId;
                 };
                 this.statsManager.getPlayCount(trackId).then(count => {
                     if (stillCurrent()) { this._nbCounts.plays = count; this._renderNbCounts(); }
                 });
                 this.statsManager.getLikeCount(trackId).then(count => {
                     if (stillCurrent()) { this._nbCounts.likes = count; this._renderNbCounts(); }
                 });
             } else {
                 this.elements.nbPlayCount.textContent = '';
             }
        }

        this.updatePlayButton(true);

        // Update Favorite Icon
        const isFav = this.audio.isFavorite(track.url);
        this.updateFavoriteIcon(isFav);
    }

    // Helper to handle marquee effect
    updateScrollingText(element, text) {
        if (!element) return;
        
        // Reset to check width
        element.innerHTML = '';
        element.classList.remove('is-scrolling', 'marquee-container', 'scroll-active');
        // Clear any previous timer
        if (element._marqueeTimer) {
            clearInterval(element._marqueeTimer);
            element._marqueeTimer = null;
        }
        if (element._marqueeKick) {
            clearTimeout(element._marqueeKick);
            element._marqueeKick = null;
        }
        
        // Create a temporary span to measure text width vs container
        const span = document.createElement('span');
        span.textContent = text;
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'nowrap';
        document.body.appendChild(span);
        const textWidth = span.offsetWidth;
        document.body.removeChild(span);

        const containerWidth = element.offsetWidth || element.parentElement.offsetWidth; // Fallback
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const isTitle = element.id === 'nbTitle';
        const longEnough = typeof text === 'string' && text.length > 15;

        // Check if text overflows significantly (e.g., > 95% of container)
        // Note: element.offsetWidth might be 0 if hidden, so we need to be careful.
        // If the bar is hidden, we just set text. When shown, layout might change, but usually text is static.
        
        if (textWidth > containerWidth && containerWidth > 0 && isMobile && isTitle && longEnough) {
            element.classList.add('is-scrolling', 'marquee-container');
            element.innerHTML = `<span class="marquee-content">${text}</span><span class="marquee-content">${text}</span>`;
            // Kick the animation every 10s, with a single 6s run
            const startScroll = () => {
                element.classList.add('scroll-active');
                // Stop after duration (~6s)
                element._marqueeKick = setTimeout(() => {
                    element.classList.remove('scroll-active');
                    element._marqueeKick = null;
                }, 6000);
            };
            // Initial delay so it doesn't move immediately
            element._marqueeTimer = setInterval(startScroll, 10000);
            // Start once after a short delay to avoid instant movement
            setTimeout(startScroll, 1200);
        } else {
            element.textContent = text;
        }
    }

    updateProgress({ currentTime, duration }) {
        if (!duration || isNaN(duration) || duration <= 0) return;
        const progress = Math.max(0, Math.min(100, (currentTime / duration) * 100)) || 0;

        // Main UI
        if (this.elements.currentTime) this.elements.currentTime.textContent = formatDuration(currentTime);
        if (this.elements.progressBar) this.elements.progressBar.value = progress;
        if (this.elements.progressFill) this.elements.progressFill.style.width = `${progress}%`;

        // Bottom Bar
        if (this.elements.nbProgressFill) this.elements.nbProgressFill.style.width = `${progress}%`;
        if (this.elements.nbCurrent) this.elements.nbCurrent.textContent = formatDuration(currentTime);
        if (this.elements.nbTotal) this.elements.nbTotal.textContent = formatDuration(duration);
    }

    updateDuration({ duration }) {
        const formatted = formatDuration(duration);
        if (this.elements.totalTime) this.elements.totalTime.textContent = formatted;
        if (this.elements.nbTotal) this.elements.nbTotal.textContent = formatted;
    }

    // Helper function to extract year and optional name from album title
    extractAlbumDisplayName(title) {
        // Match patterns like "2005 (Nous Deus I)" or just "2006"
        const match = title.match(/^(\d{4})(?:\s*\(([^)]+)\))?/);
        if (match) {
            const year = match[1];
            const name = match[2];
            return name ? `${year} (${name})` : year;
        }
        return title; // Fallback to full title if pattern doesn't match
    }

    showAlbumTracksModal(album, albumIndex) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;

        // Modal content
        const content = document.createElement('div');
        content.style.cssText = `
            background: #181818;
            border-radius: 8px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 2rem;
        `;

        // Header with album info
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; gap: 1.5rem; margin-bottom: 2rem;';

        const cover = document.createElement('img');
        cover.src = album.cover;
        cover.style.cssText = 'width: 150px; height: 150px; border-radius: 4px; object-fit: cover;';

        const headerInfo = document.createElement('div');
        headerInfo.style.cssText = 'flex: 1; display: flex; flex-direction: column; justify-content: center;';
        headerInfo.innerHTML = `
            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">${album.title}</h2>
            <p style="margin: 0; color: #b3b3b3;">${album.artist} • ${album.tracks.length} tracks</p>
        `;

        header.appendChild(cover);
        header.appendChild(headerInfo);

        // Track list
        const trackList = document.createElement('div');
        trackList.style.cssText = 'display: flex; flex-direction: column; gap: 0.25rem;';

        album.tracks.forEach((track, trackIndex) => {
            const trackRow = document.createElement('div');
            trackRow.style.cssText = `
                padding: 0.75rem;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 1rem;
            `;

            const trackId = track.filename ? track.filename.replace(/[^a-zA-Z0-9]/g, '-') : `track-${albumIndex}-${trackIndex}`;
            
            // Create placeholders first
            trackRow.innerHTML = `
                <span style="color: #666; width: 30px;">${trackIndex + 1}</span>
                <span style="flex: 1;">${track.title}</span>
                <span id="play-count-${trackId}" style="color: #666; font-size: 0.8rem; min-width: 60px; text-align: right;">...</span>
            `;

            // Fetch count asynchronously
            if (this.statsManager) {
                this.statsManager.getPlayCount(trackId).then(count => {
                    const el = document.getElementById(`play-count-${trackId}`);
                    if (el) el.textContent = this.statsManager.formatCount(count);
                });
            }

            // Context menu (⋯)
            trackRow.appendChild(this._makeMenuButton({ ...track, album }));

            trackRow.onmouseenter = () => trackRow.style.background = 'rgba(255,255,255,0.1)';
            trackRow.onmouseleave = () => trackRow.style.background = 'transparent';

            trackRow.onclick = () => {
                this.audio.loadAlbum(albumIndex, trackIndex);
                this.audio.play();
                document.body.removeChild(modal);
            };

            trackList.appendChild(trackRow);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            color: #fff;
            font-size: 2rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        `;
        closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';
        closeBtn.onmouseleave = () => closeBtn.style.background = 'none';
        closeBtn.onclick = () => document.body.removeChild(modal);

        content.appendChild(closeBtn);
        content.appendChild(header);
        content.appendChild(trackList);
        modal.appendChild(content);

        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };

        document.body.appendChild(modal);
    }

    // ---------- Track context menu (⋯) ----------

    showTrackMenu(track, opts = {}) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            z-index: 1100; display: flex; align-items: flex-end; justify-content: center;
        `;

        const sheet = document.createElement('div');
        sheet.style.cssText = `
            background: #181818; width: 100%; max-width: 500px;
            border-radius: 12px 12px 0 0; padding: 1rem; box-sizing: border-box;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'padding: 0.5rem 0.8rem 1rem; color: #b3b3b3; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        header.textContent = track.title;
        sheet.appendChild(header);

        const close = () => document.body.removeChild(overlay);

        const addOption = (icon, label, handler) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                display: flex; align-items: center; gap: 1rem; width: 100%;
                background: none; border: none; color: #fff; padding: 0.9rem 0.8rem;
                font-size: 1rem; cursor: pointer; text-align: left; border-radius: 8px;
            `;
            btn.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${label}</span>`;
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
            btn.onmouseleave = () => btn.style.background = 'none';
            btn.onclick = () => { close(); handler(); };
            sheet.appendChild(btn);
        };

        const isFav = this.audio.isFavorite(track.url);
        addOption(isFav ? '💔' : '❤️', isFav ? 'Quitar de Favoritos' : 'Agregar a Favoritos', () => {
            const nowFav = this.audio.toggleFavorite(track);
            const current = this.audio.tracks[this.audio.index];
            if (current && current.url === track.url) this.updateFavoriteIcon(nowFav);
            if (opts.onChange) opts.onChange();
        });

        addOption('➕', 'Agregar a playlist', () => this._showPlaylistChooser(track, opts.onChange));

        addOption('⏭️', 'Agregar a la cola', () => {
            this.audio.addToQueue(track);
            this.showToast('Agregada a la cola');
        });

        if (opts.playlistName && this.audio.playlists[opts.playlistName]) {
            addOption('🗑️', `Quitar de "${opts.playlistName}"`, () => {
                this.audio.removeFromPlaylist(opts.playlistName, track.url);
                if (opts.onChange) opts.onChange();
            });
        }

        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
    }

    _showPlaylistChooser(track, onChange = null) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            z-index: 1100; display: flex; align-items: flex-end; justify-content: center;
        `;
        const sheet = document.createElement('div');
        sheet.style.cssText = `
            background: #181818; width: 100%; max-width: 500px;
            border-radius: 12px 12px 0 0; padding: 1rem; box-sizing: border-box;
            max-height: 60vh; overflow-y: auto;
        `;
        const close = () => document.body.removeChild(overlay);

        const title = document.createElement('div');
        title.style.cssText = 'padding: 0.5rem 0.8rem 1rem; color: #b3b3b3; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem;';
        title.textContent = 'Agregar a playlist';
        sheet.appendChild(title);

        const addOption = (icon, label, handler, highlight = false) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                display: flex; align-items: center; gap: 1rem; width: 100%;
                background: none; border: none; padding: 0.9rem 0.8rem;
                font-size: 1rem; cursor: pointer; text-align: left; border-radius: 8px;
                color: ${highlight ? 'var(--primary-color)' : '#fff'};
                ${highlight ? 'font-weight: bold;' : ''}
            `;
            btn.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${label}</span>`;
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
            btn.onmouseleave = () => btn.style.background = 'none';
            btn.onclick = () => { close(); handler(); };
            sheet.appendChild(btn);
        };

        addOption('➕', 'Nueva playlist…', () => {
            const name = prompt('Nombre de la playlist:');
            if (name && this.audio.createPlaylist(name)) {
                this.audio.addToPlaylist(name.trim(), track);
                this.showToast(`Agregada a "${name.trim()}"`);
                if (onChange) onChange();
            } else if (name) {
                this.showToast('Ya existe una playlist con ese nombre');
            }
        }, true);

        const names = Object.keys(this.audio.playlists);
        if (names.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 1rem 0.8rem; color: #666; font-size: 0.9rem;';
            empty.textContent = 'Aún no tienes playlists';
            sheet.appendChild(empty);
        }
        names.forEach(name => {
            const count = this.audio.playlists[name].length;
            addOption('🎵', `${name} (${count})`, () => {
                const added = this.audio.addToPlaylist(name, track);
                this.showToast(added ? `Agregada a "${name}"` : `Ya está en "${name}"`);
                if (onChange) onChange();
            });
        });

        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
    }

    // ---------- Audio / EQ panel (🎚️) ----------

    showMixerPanel() {
        const audio = this.audio;
        const track = audio.tracks[audio.index];

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            z-index: 1100; display: flex; align-items: flex-end; justify-content: center;
        `;
        const sheet = document.createElement('div');
        sheet.style.cssText = `
            background: #181818; width: 100%; max-width: 500px;
            border-radius: 12px 12px 0 0; padding: 1.2rem; box-sizing: border-box;
            max-height: 80vh; overflow-y: auto; color: #fff;
        `;
        const close = () => document.body.removeChild(overlay);

        const sectionTitle = (text) => {
            const el = document.createElement('div');
            el.style.cssText = 'font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #b3b3b3; margin: 1.2rem 0 0.5rem;';
            el.textContent = text;
            return el;
        };

        const sliderRow = (labelText, min, max, step, value, format, onInput) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 0.8rem; padding: 0.35rem 0;';
            const label = document.createElement('span');
            label.style.cssText = 'width: 62px; font-size: 0.85rem; flex-shrink: 0;';
            label.textContent = labelText;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min; slider.max = max; slider.step = step; slider.value = value;
            slider.style.cssText = 'flex: 1; accent-color: var(--primary-color);';
            const val = document.createElement('span');
            val.style.cssText = 'width: 52px; text-align: right; font-size: 0.8rem; color: #b3b3b3; flex-shrink: 0; font-variant-numeric: tabular-nums;';
            val.textContent = format(parseFloat(value));
            slider.addEventListener('input', () => {
                const v = parseFloat(slider.value);
                val.textContent = format(v);
                onInput(v);
            });
            row.appendChild(label); row.appendChild(slider); row.appendChild(val);
            return { row, slider, val };
        };

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
        header.innerHTML = '<span style="font-weight: bold; font-size: 1.05rem;">🎚️ Audio</span>';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.style.cssText = 'background: none; border: none; color: #b3b3b3; font-size: 1.1rem; cursor: pointer; padding: 0.3rem 0.5rem;';
        closeBtn.onclick = close;
        header.appendChild(closeBtn);
        sheet.appendChild(header);

        // --- Master volume ---
        sheet.appendChild(sectionTitle('Volumen general'));
        sheet.appendChild(sliderRow('🔊', 0, 100, 1, Math.round(audio.getVolume() * 100),
            v => `${Math.round(v)}%`,
            v => audio.setVolume(v / 100)
        ).row);

        // --- Per-track offset ---
        sheet.appendChild(sectionTitle('Volumen de esta canción'));
        const trackName = document.createElement('div');
        trackName.style.cssText = 'font-size: 0.8rem; color: #b3b3b3; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        trackName.textContent = track ? track.title : '—';
        sheet.appendChild(trackName);

        const fmtDb = (v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) + ' dB';
        const offsetControl = sliderRow('🎵', -12, 12, 0.5, audio.getTrackVolumeOffset(track),
            fmtDb,
            v => audio.setTrackVolumeOffset(track, v)
        );
        sheet.appendChild(offsetControl.row);

        const offsetHint = document.createElement('div');
        offsetHint.style.cssText = 'font-size: 0.72rem; color: #666; display: flex; justify-content: space-between; align-items: center;';
        const hintText = document.createElement('span');
        hintText.textContent = 'Se guarda y se aplica siempre que suene esta canción.';
        const resetOffset = document.createElement('button');
        resetOffset.textContent = 'Restablecer';
        resetOffset.style.cssText = 'background: none; border: 1px solid rgba(255,255,255,0.2); color: #b3b3b3; font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 10px; cursor: pointer;';
        resetOffset.onclick = () => {
            audio.setTrackVolumeOffset(track, 0);
            offsetControl.slider.value = 0;
            offsetControl.val.textContent = fmtDb(0);
        };
        offsetHint.appendChild(hintText);
        offsetHint.appendChild(resetOffset);
        sheet.appendChild(offsetHint);

        // --- EQ presets ---
        sheet.appendChild(sectionTitle('Ecualizador'));
        const presets = [
            { id: 'normal', name: 'Normal' },
            { id: 'bass', name: 'Bass' },
            { id: 'vocal', name: 'Vocal' },
            { id: 'bright', name: 'Bright' },
            { id: 'dance', name: 'Dance' }
        ];
        const presetRow = document.createElement('div');
        presetRow.style.cssText = 'display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem;';

        const eqSliders = {}; // filled below
        let activePreset = audio.eqSettings?.preset || 'normal';

        const stylePresetBtn = (btn, active) => {
            btn.style.cssText = `
                border: none; padding: 0.4rem 0.9rem; border-radius: 16px; cursor: pointer;
                font-size: 0.8rem; font-weight: 600;
                background: ${active ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'};
                color: ${active ? '#000' : '#fff'};
            `;
        };

        const presetBtns = {};
        const refreshPresetBtns = () => {
            presets.forEach(p => stylePresetBtn(presetBtns[p.id], activePreset === p.id));
        };

        presets.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.name;
            presetBtns[p.id] = btn;
            btn.onclick = () => {
                audio.applyEQPreset(p.id);
                activePreset = p.id;
                refreshPresetBtns();
                // Sync sliders to preset values
                const vals = audio.equalizer.presets[p.id];
                ['low', 'mid', 'high'].forEach(band => {
                    eqSliders[band].slider.value = vals[band];
                    eqSliders[band].val.textContent = fmtDb(vals[band]);
                });
            };
            presetRow.appendChild(btn);
        });
        sheet.appendChild(presetRow);

        // --- EQ manual sliders ---
        const bands = [
            { id: 'low', label: 'Graves' },
            { id: 'mid', label: 'Medios' },
            { id: 'high', label: 'Agudos' }
        ];
        const onManualChange = () => {
            audio.setCustomEQ([eqSliders.low.slider.value, eqSliders.mid.slider.value, eqSliders.high.slider.value]);
            activePreset = 'custom';
            refreshPresetBtns(); // none highlighted
        };
        bands.forEach(b => {
            const current = audio.eqSettings?.[b.id] ?? 0;
            const ctrl = sliderRow(b.label, -12, 12, 0.5, current, fmtDb, onManualChange);
            eqSliders[b.id] = ctrl;
            sheet.appendChild(ctrl.row);
        });
        refreshPresetBtns();

        // --- Normalization toggle ---
        const normRow = document.createElement('label');
        normRow.style.cssText = 'display: flex; align-items: center; gap: 0.6rem; margin-top: 1rem; font-size: 0.85rem; cursor: pointer; color: #b3b3b3;';
        const normCheck = document.createElement('input');
        normCheck.type = 'checkbox';
        normCheck.checked = audio.volumeNormalization.enabled;
        normCheck.style.accentColor = 'var(--primary-color)';
        normCheck.onchange = () => audio.toggleVolumeNormalization(normCheck.checked);
        normRow.appendChild(normCheck);
        normRow.appendChild(document.createTextNode('Normalizar volumen entre canciones'));
        sheet.appendChild(normRow);

        // Keep gestures inside the panel from triggering the now-bar swipe
        ['touchstart', 'touchmove', 'touchend'].forEach(ev =>
            sheet.addEventListener(ev, (e) => e.stopPropagation(), { passive: true })
        );

        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%);
            background: rgba(30,30,30,0.95); color: #fff; padding: 0.6rem 1.2rem;
            border-radius: 20px; font-size: 0.9rem; z-index: 1200;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: opacity 0.3s;
            pointer-events: none; white-space: nowrap;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; }, 1800);
        setTimeout(() => { toast.remove(); }, 2200);
    }

    // Small ⋯ button used on track rows
    _makeMenuButton(track, opts = {}) {
        const btn = document.createElement('button');
        btn.textContent = '⋯';
        btn.setAttribute('aria-label', 'Opciones de la canción');
        btn.style.cssText = `
            background: none; border: none; color: #b3b3b3; font-size: 1.3rem;
            cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 4px; flex-shrink: 0;
        `;
        btn.onclick = (e) => {
            e.stopPropagation();
            this.showTrackMenu(track, opts);
        };
        return btn;
    }

    renderPlaylist(container) {
        if (!container) return;
        this._playlistSubview = null;

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'track-list';
        list.style.cssText = 'padding-bottom: 100px;'; // Space for player

        const itemStyle = 'padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #fff; transition: background 0.2s;';

        // Create New Playlist Button
        const createBtn = document.createElement('div');
        createBtn.style.cssText = itemStyle + 'color: var(--primary-color); font-weight: bold;';
        createBtn.textContent = '+ Crear nueva playlist';
        createBtn.onclick = () => {
            const name = prompt('Nombre de la playlist:');
            if (name) {
                if (!this.audio.createPlaylist(name)) {
                    this.showToast('Ya existe una playlist con ese nombre');
                }
                this.renderPlaylist(container);
            }
        };
        createBtn.onmouseenter = () => createBtn.style.background = 'rgba(255,255,255,0.1)';
        createBtn.onmouseleave = () => createBtn.style.background = 'transparent';
        list.appendChild(createBtn);

        // Helper to create list item
        const createItem = (icon, title, count, tracks, options = {}) => {
            const div = document.createElement('div');
            div.style.cssText = itemStyle;

            const first = Array.isArray(tracks) && tracks.length > 0 ? tracks[0] : null;
            const coverSrc = first?.cover || first?.album?.cover || '';

            const left = document.createElement('div');
            left.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; overflow: hidden;';
            left.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 4px; background: #282828; position: relative; overflow: hidden; flex-shrink: 0;">
                    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #666;">
                        <span style="font-size: 1.2rem;">${icon}</span>
                    </div>
                    ${coverSrc ? `<img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; display: block;" onerror="this.style.display='none'">` : ''}
                </div>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
            `;

            const right = document.createElement('div');
            right.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;';

            const countSpan = document.createElement('span');
            countSpan.style.cssText = 'opacity:0.6; font-size:0.8rem;';
            countSpan.textContent = options.countLabel !== undefined ? options.countLabel : `${count} tracks`;
            right.appendChild(countSpan);

            // Management buttons for user playlists
            if (options.managed) {
                const renameBtn = document.createElement('button');
                renameBtn.textContent = '✏️';
                renameBtn.setAttribute('aria-label', `Renombrar ${title}`);
                renameBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.2rem;';
                renameBtn.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt('Nuevo nombre:', title);
                    if (newName && newName.trim() !== title) {
                        if (!this.audio.renamePlaylist(title, newName)) {
                            this.showToast('No se pudo renombrar (¿nombre repetido?)');
                        }
                        this.renderPlaylist(container);
                    }
                };
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.setAttribute('aria-label', `Eliminar ${title}`);
                deleteBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.2rem;';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar la playlist "${title}"?`)) {
                        this.audio.deletePlaylist(title);
                        this.renderPlaylist(container);
                    }
                };
                right.appendChild(renameBtn);
                right.appendChild(deleteBtn);
            }

            const chevron = document.createElement('span');
            chevron.style.cssText = 'font-size: 1.2rem;';
            chevron.textContent = '›';
            right.appendChild(chevron);

            div.appendChild(left);
            div.appendChild(right);

            div.onclick = () => {
                if (options.onOpen) return options.onOpen();
                if (count === 0) return this.showToast('La lista está vacía');
                this.renderPlaylistTracks(tracks, title, container, options.trackOpts || {});
            };

            div.onmouseenter = () => div.style.background = 'rgba(255,255,255,0.1)';
            div.onmouseleave = () => div.style.background = 'transparent';

            return div;
        };

        // Queue
        list.appendChild(createItem('📋', 'Cola de reproducción', this.audio.queue.length, this.audio.queue, {
            onOpen: () => this.renderQueueView(container)
        }));

        // Top played
        list.appendChild(createItem('🔥', 'Top más escuchadas', 1, [], {
            countLabel: 'ranking',
            onOpen: () => this.renderTopView(container)
        }));

        // History
        list.appendChild(createItem('🕐', 'Historial', this.audio.history.length, this.audio.history));

        // Favorites
        list.appendChild(createItem('❤️', 'Favoritos', this.audio.favorites.length, this.audio.favorites));

        // User Playlists
        Object.keys(this.audio.playlists).forEach(name => {
            list.appendChild(createItem('🎵', name, this.audio.playlists[name].length, this.audio.playlists[name], {
                managed: true,
                trackOpts: { playlistName: name }
            }));
        });

        container.appendChild(list);
    }

    renderPlaylistTracks(tracks, title, container, opts = {}) {
        if (!container) return;
        this._playlistSubview = { tracks, title, playlistName: opts.playlistName || null };

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'track-list';
        list.style.cssText = 'padding-bottom: 100px;';

        // Header with Back button
        const header = document.createElement('div');
        header.style.cssText = 'padding: 1rem; display: flex; align-items: center; gap: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem; flex-wrap: wrap;';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '←';
        backBtn.setAttribute('aria-label', 'Volver');
        backBtn.style.cssText = 'background: none; border: none; color: var(--primary-color); font-size: 1.5rem; cursor: pointer; padding: 0; display: flex; align-items: center;';
        backBtn.onclick = () => this.renderPlaylist(container);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleSpan.style.fontWeight = 'bold';
        titleSpan.style.fontSize = '1.1rem';
        titleSpan.style.color = '#fff';

        // Mode toggle helpers
        const modeBtnStyle = (active) => `
            background: ${active ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'};
            color: ${active ? '#000' : '#fff'};
            border: none; padding: 0.4rem 0.7rem; border-radius: 20px;
            cursor: pointer; font-size: 0.9rem; line-height: 1;
        `;

        // Shuffle toggle
        const shuffleBtn = document.createElement('button');
        shuffleBtn.textContent = '🔀';
        shuffleBtn.setAttribute('aria-label', 'Aleatorio');
        shuffleBtn.title = 'Aleatorio';
        shuffleBtn.style.cssText = modeBtnStyle(this.audio.playbackMode === 'shuffle') + 'margin-left: auto;';
        shuffleBtn.onclick = () => {
            this.audio.setPlaybackMode(this.audio.playbackMode === 'shuffle' ? 'normal' : 'shuffle');
            this.renderPlaylistTracks(tracks, title, container, opts);
            this.showToast(this.audio.playbackMode === 'shuffle' ? 'Aleatorio activado' : 'Aleatorio desactivado');
        };

        // Repeat toggle (cycles: normal → repeat_all → repeat_one)
        const repeatBtn = document.createElement('button');
        const repeatMode = this.audio.playbackMode;
        repeatBtn.textContent = repeatMode === 'repeat_one' ? '🔂' : '🔁';
        repeatBtn.setAttribute('aria-label', 'Repetir');
        repeatBtn.title = 'Repetir';
        repeatBtn.style.cssText = modeBtnStyle(repeatMode === 'repeat_all' || repeatMode === 'repeat_one');
        repeatBtn.onclick = () => {
            const current = this.audio.playbackMode;
            const nextMode = current === 'repeat_all' ? 'repeat_one' : (current === 'repeat_one' ? 'normal' : 'repeat_all');
            this.audio.setPlaybackMode(nextMode);
            this.renderPlaylistTracks(tracks, title, container, opts);
            const labels = { repeat_all: 'Repetir lista', repeat_one: 'Repetir canción', normal: 'Repetición desactivada' };
            this.showToast(labels[nextMode]);
        };

        // Play All button
        const playAllBtn = document.createElement('button');
        playAllBtn.textContent = '▶ Reproducir';
        playAllBtn.style.cssText = 'background: var(--primary-color); color: #000; border: none; padding: 0.4rem 1rem; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 0.8rem;';
        playAllBtn.onclick = () => {
            if (!tracks.length) return;
            if (this.audio.playbackMode === 'infinite_random') this.audio.setPlaybackMode('normal');
            this.audio.tracks = [...tracks];
            this.audio.currentAlbum = title;
            const startIdx = this.audio.playbackMode === 'shuffle'
                ? Math.floor(Math.random() * tracks.length)
                : 0;
            this.audio.index = startIdx;
            this.audio.load(startIdx);
            this.audio.play();
        };

        header.appendChild(backBtn);
        header.appendChild(titleSpan);
        header.appendChild(shuffleBtn);
        header.appendChild(repeatBtn);
        header.appendChild(playAllBtn);
        list.appendChild(header);

        // Tracks
        const tracksContainer = document.createElement('div');
        tracksContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem;';

        tracks.forEach((track, index) => {
            const div = document.createElement('div');
            div.className = 'track';
            div.style.cssText = 'padding: 0.8rem; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: background 0.2s;';

            // Check if currently playing
            const isPlaying = this.audio.currentAlbum === title && this.audio.index === index;
            if (isPlaying) {
                div.style.color = 'var(--primary-color)';
            } else {
                div.style.color = '#fff';
            }

            // Get cover image (fallback using albumKey if available)
            const albumFromKey = track.albumKey ? this.audio.albums[track.albumKey] : null;
            const coverSrc = track.cover || track.album?.cover || albumFromKey?.cover || '';

            div.innerHTML = `
                <span style="color: inherit; opacity: 0.7; width: 20px; text-align: center;">${index + 1}</span>
                <div style="width: 40px; height: 40px; border-radius: 4px; background: #282828; position: relative; overflow: hidden; flex-shrink: 0;">
                    <!-- Fallback Icon (always behind) -->
                    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #66ff99;">
                        <span style="font-size: 1.2rem;">👽</span>
                    </div>
                    <!-- Image (on top) -->
                    ${coverSrc ? `<img src="${coverSrc}" 
                         style="width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; display: block;" 
                         onerror="this.style.display='none'">` : ''}
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${track.title}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${track.albumTitle || track.artist || track.album?.artist || albumFromKey?.artist || 'Unknown'}</div>
                </div>
                <div class="play-count" style="font-size: 0.7rem; opacity: 0.5; min-width: 40px; text-align: right; margin-left: 0.5rem;"></div>
            `;

            if (this.statsManager) {
                const trackId = this._trackIdFor(track);
                if (trackId) {
                    const countEl = div.querySelector('.play-count');
                    if (countEl) countEl.setAttribute('data-track-id', trackId);

                    this.statsManager.getPlayCount(trackId).then(count => {
                        if (countEl && count > 0) countEl.textContent = '▶ ' + this.statsManager.formatCount(count);
                    });
                }
            }

            // Context menu (⋯)
            div.appendChild(this._makeMenuButton(track, {
                playlistName: opts.playlistName || null,
                onChange: () => {
                    // Re-read source list in case it changed (removals)
                    const freshTracks = opts.playlistName
                        ? (this.audio.playlists[opts.playlistName] || [])
                        : tracks;
                    this.renderPlaylistTracks(freshTracks, title, container, opts);
                }
            }));

            div.onclick = () => {
                if (this.audio.playbackMode === 'infinite_random') this.audio.setPlaybackMode('normal');
                this.audio.tracks = [...tracks];
                this.audio.currentAlbum = title;
                this.audio.index = index;
                this.audio.load(index);
                this.audio.play();
                // Re-render to update active state
                this.renderPlaylistTracks(tracks, title, container, opts);
            };

            div.onmouseenter = () => {
                if (!isPlaying) div.style.background = 'rgba(255,255,255,0.1)';
            };
            div.onmouseleave = () => {
                div.style.background = 'transparent';
            };

            tracksContainer.appendChild(div);
        });

        list.appendChild(tracksContainer);
        container.appendChild(list);
    }

    // ---------- Queue view ----------

    renderQueueView(container) {
        if (!container) return;
        this._playlistSubview = 'queue';

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'track-list';
        list.style.cssText = 'padding-bottom: 100px;';

        const header = document.createElement('div');
        header.style.cssText = 'padding: 1rem; display: flex; align-items: center; gap: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem;';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '←';
        backBtn.setAttribute('aria-label', 'Volver');
        backBtn.style.cssText = 'background: none; border: none; color: var(--primary-color); font-size: 1.5rem; cursor: pointer; padding: 0;';
        backBtn.onclick = () => this.renderPlaylist(container);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = '📋 Cola de reproducción';
        titleSpan.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #fff;';

        header.appendChild(backBtn);
        header.appendChild(titleSpan);

        if (this.audio.queue.length > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.textContent = 'Vaciar';
            clearBtn.style.cssText = 'margin-left: auto; background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 20px; cursor: pointer; font-size: 0.8rem;';
            clearBtn.onclick = () => {
                this.audio.clearQueue();
                this.renderQueueView(container);
            };
            header.appendChild(clearBtn);
        }
        list.appendChild(header);

        if (this.audio.queue.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 2rem 1rem; color: #666; text-align: center;';
            empty.innerHTML = 'La cola está vacía.<br><span style="font-size: 0.85rem;">Usa el botón ⋯ de cualquier canción para agregarla.</span>';
            list.appendChild(empty);
        }

        this.audio.queue.forEach((track, index) => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 0.8rem 1rem; display: flex; align-items: center; gap: 1rem; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.05);';

            const albumFromKey = track.albumKey ? this.audio.albums[track.albumKey] : null;
            const coverSrc = track.cover || albumFromKey?.cover || '';

            div.innerHTML = `
                <span style="opacity: 0.6; width: 20px; text-align: center;">${index + 1}</span>
                <div style="width: 40px; height: 40px; border-radius: 4px; background: #282828; overflow: hidden; flex-shrink: 0;">
                    ${coverSrc ? `<img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : ''}
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${track.title}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${track.albumTitle || track.artist || ''}</div>
                </div>
            `;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.setAttribute('aria-label', 'Quitar de la cola');
            removeBtn.style.cssText = 'background: none; border: none; color: #b3b3b3; font-size: 1rem; cursor: pointer; padding: 0.3rem 0.5rem;';
            removeBtn.onclick = () => {
                this.audio.removeFromQueue(index);
                this.renderQueueView(container);
            };
            div.appendChild(removeBtn);

            list.appendChild(div);
        });

        container.appendChild(list);
    }

    // ---------- Top played view ----------

    renderTopView(container) {
        if (!container) return;
        this._playlistSubview = 'top';

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'track-list';
        list.style.cssText = 'padding-bottom: 100px;';

        const header = document.createElement('div');
        header.style.cssText = 'padding: 1rem; display: flex; align-items: center; gap: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem;';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '←';
        backBtn.setAttribute('aria-label', 'Volver');
        backBtn.style.cssText = 'background: none; border: none; color: var(--primary-color); font-size: 1.5rem; cursor: pointer; padding: 0;';
        backBtn.onclick = () => this.renderPlaylist(container);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = '🔥 Top más escuchadas';
        titleSpan.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #fff;';

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '↻';
        refreshBtn.setAttribute('aria-label', 'Actualizar ranking');
        refreshBtn.title = 'Actualizar';
        refreshBtn.style.cssText = 'margin-left: auto; background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 20px; cursor: pointer; font-size: 0.9rem;';
        refreshBtn.onclick = () => {
            this.statsManager.invalidateTopCache();
            this.renderTopView(container);
        };

        header.appendChild(backBtn);
        header.appendChild(titleSpan);
        header.appendChild(refreshBtn);
        list.appendChild(header);

        const status = document.createElement('div');
        status.style.cssText = 'padding: 1rem; color: #666; text-align: center; font-size: 0.9rem;';
        status.textContent = 'Cargando ranking…';
        list.appendChild(status);

        const resultsContainer = document.createElement('div');
        list.appendChild(resultsContainer);
        container.appendChild(list);

        // Collect all tracks with their IDs
        const allTracks = [];
        Object.values(this.audio.albums).forEach(album => {
            album.tracks.forEach(track => {
                const trackId = this._trackIdFor(track);
                if (trackId) allTracks.push({ ...track, album, trackId });
            });
        });

        const trackIds = allTracks.map(t => t.trackId);

        this.statsManager.getTopCounts(trackIds, (done, total) => {
            status.textContent = `Cargando ranking… ${done}/${total}`;
        }).then(counts => {
            // Abort if user navigated away meanwhile
            if (this._playlistSubview !== 'top') return;

            const ranked = allTracks
                .map(t => ({ ...t, plays: counts[t.trackId] || 0 }))
                .filter(t => t.plays > 0)
                .sort((a, b) => b.plays - a.plays)
                .slice(0, 25);

            status.remove();

            if (ranked.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding: 2rem 1rem; color: #666; text-align: center;';
                empty.textContent = 'Aún no hay reproducciones registradas.';
                resultsContainer.appendChild(empty);
                return;
            }

            const medals = ['🥇', '🥈', '🥉'];

            ranked.forEach((track, index) => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 0.8rem 1rem; display: flex; align-items: center; gap: 1rem; color: #fff; cursor: pointer; border-radius: 4px; transition: background 0.2s;';

                const rank = medals[index] || `${index + 1}`;
                const coverSrc = track.album?.cover || '';

                div.innerHTML = `
                    <span style="width: 30px; text-align: center; font-size: ${index < 3 ? '1.2rem' : '0.9rem'}; opacity: ${index < 3 ? '1' : '0.6'};">${rank}</span>
                    <div style="width: 40px; height: 40px; border-radius: 4px; background: #282828; overflow: hidden; flex-shrink: 0;">
                        ${coverSrc ? `<img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${track.title}</div>
                        <div style="font-size: 0.8rem; opacity: 0.7;">${track.album?.title || ''}</div>
                    </div>
                    <span style="font-size: 0.8rem; opacity: 0.7; flex-shrink: 0;">▶ ${this.statsManager.formatCount(track.plays)}</span>
                `;

                div.appendChild(this._makeMenuButton(track));

                div.onclick = () => {
                    const albumKeys = Object.keys(this.audio.albums);
                    const albumIndex = albumKeys.indexOf(track.album.key);
                    const trackIndex = track.album.tracks.findIndex(t => t.url === track.url);
                    if (albumIndex >= 0 && trackIndex >= 0) {
                        this.audio.loadAlbum(albumIndex, trackIndex);
                        this.audio.play();
                    }
                };

                div.onmouseenter = () => div.style.background = 'rgba(255,255,255,0.1)';
                div.onmouseleave = () => div.style.background = 'transparent';

                resultsContainer.appendChild(div);
            });
        });
    }

}
