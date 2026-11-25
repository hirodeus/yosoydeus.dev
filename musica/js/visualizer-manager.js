// Import all visuals statically so Vite can bundle them
import { createScene as createTronScene } from '../visuals/visual1_tron_mountains.js';
import { createScene as createMotherboardScene } from '../visuals/visual2_motherboard.js';
import { createScene as createLandscapeScene } from '../visuals/visual_premium_landscape.js';
import { createScene as createMorpherScene } from '../visuals/visual3_morpher.js';
import { createScene as createParticlesScene } from '../visuals/visual5_particles.js';
import { createScene as createOrbsScene } from '../visuals/visual6_orbs.js';
import { createScene as createTunnelScene } from '../visuals/visual7_tunnel.js';

export class VisualizerManager {
    constructor({ container, audioManager }) {
        this.container = container;
        this.audio = audioManager;
        this.current = null;
        this.sceneAPI = null;
        this.running = false;
        this.quality = (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)) ? 'low' : 'high';

        // Map of visual keys to their factory functions
        this.visualFactories = {
            'tron': createTronScene,
            'motherboard': createMotherboardScene,
            'landscape': createLandscapeScene,
            'morpher': createMorpherScene,
            'particles': createParticlesScene,
            'orbs': createOrbsScene,
            'tunnel': createTunnelScene
        };
    }

    async loadVisual(key) {
        try {
            console.log('[VIZ] Loading visual:', key);
            const factory = this.visualFactories[key];

            if (!factory) {
                console.error('[VIZ] Unknown visual key:', key);
                return null;
            }

            console.log('[VIZ] Visual factory found:', key);
            this.current = key;
            return factory;
        } catch (e) {
            console.error('[VIZ] Failed to load visual:', e);
            return null;
        }
    }

    async startVisual(key) {
        console.log('[VIZ] Starting visual:', key);

        if (this.sceneAPI) {
            console.log('[VIZ] Stopping previous scene');
            this.sceneAPI.stop?.();
            this.sceneAPI.dispose?.();
        }

        // Clean up old canvases
        Array.from(this.container.querySelectorAll('canvas')).forEach(c => {
            if (c.id !== 'fallbackCanvas') {
                console.log('[VIZ] Removing old canvas:', c);
                c.remove();
            }
        });

        document.getElementById('fallbackCanvas')?.classList.add('hidden');

        console.log('[VIZ] Loading visual module...');
        const factory = await this.loadVisual(key);
        if (!factory) {
            console.error('[VIZ] No factory returned from loadVisual');
            return;
        }

        console.log('[VIZ] Creating scene with factory...');
        this.sceneAPI = await factory({
            container: this.container,
            audioManager: this.audio,
            quality: this.quality,
            onReady: () => { console.log('[VIZ] Scene ready!'); }
        });

        console.log('[VIZ] Scene created, starting...');
        this.running = true;
        this.sceneAPI.start?.();
        console.log('[VIZ] Visual started successfully');
    }

    stop() {
        this.running = false;
        this.sceneAPI?.stop?.();
    }

    onClick() {
        this.sceneAPI?.onClick?.();
    }

    setAutoRotate(enabled) {
        this.sceneAPI?.setAutoRotate?.(enabled);
    }
}
