import { AudioManager } from './audio-manager.js?v=5';
import { VisualizerManager } from './visualizer-manager.js?v=5';
import { UIManager } from './ui-manager.js?v=5';
import { StatsManager } from './stats-manager.js?v=5';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container');

    // Check for reset flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reset-counter')) {
        localStorage.removeItem('hasVisited');
        console.log('Counter reset for testing');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const statsManager = new StatsManager();
    const audioManager = new AudioManager({ fftSize: 2048, statsManager });
    const visualizerManager = new VisualizerManager({ container, audioManager });
    const uiManager = new UIManager(audioManager, visualizerManager, statsManager);

    // Expose for debugging
    window.app = { audio: audioManager, viz: visualizerManager, ui: uiManager, stats: statsManager };
});
