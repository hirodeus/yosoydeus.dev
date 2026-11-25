import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, -20);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.25; // Higher threshold to avoid washing out colors
    bloomPass.strength = 0.7; // Lower strength for more color definition
    bloomPass.radius = 0.8; // Softer glow

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Objects ---

    // 1. Sun
    const sunGeo = new THREE.CircleGeometry(15, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff0058 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 10, -180);
    scene.add(sun);

    // Sun Glow (behind)
    const sunGlowGeo = new THREE.CircleGeometry(18, 64);
    const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.3 });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunGlow.position.set(0, 10, -81);
    scene.add(sunGlow);


    // 2. Moving Terrain (Grid)
    const planeSize = 200;
    const divisions = 60;
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, divisions, divisions);
    geometry.rotateX(-Math.PI / 2);

    // Save original positions for animation
    const positionAttribute = geometry.attributes.position;
    const originalPositions = positionAttribute.array.slice();

    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.y = -5;
    scene.add(terrain);




    // 3. Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 150;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.3,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);


    let running = true;
    let time = 0;
    let lastT = performance.now();
    let lastBeatAt = 0;
    let lastBass = 0;
    let beatPulse = 0;
    const beatIntervals = [];
    let bpm = 120;
    let hueSeed = 0.9;
    let bassLP = 0; // low‑pass filtered bass

    function animate() {
        if (!running) return;
        requestAnimationFrame(animate);

        const now = performance.now();
        const dt = (now - lastT) / 1000;
        lastT = now;
        const { low: bass, mid, high, freqArray } = audioManager.getFrequencyBands();

        time += dt * 60;

        // Smooth bass to avoid jitter
        bassLP = bassLP * 0.92 + bass * 0.08;
        const rising = bass - lastBass;
        const beatThreshold = 0.35;
        const minInterval = 0.25;
        if (bass > beatThreshold && rising > 0.12 && (now - lastBeatAt) / 1000 > minInterval) {
            const interval = (now - lastBeatAt) / 1000;
            lastBeatAt = now;
            beatPulse = 1;
            beatIntervals.push(interval);
            if (beatIntervals.length > 8) beatIntervals.shift();
            const avg = beatIntervals.reduce((a, b) => a + b, 0) / beatIntervals.length;
            bpm = Math.max(60, Math.min(180, 60 / Math.max(0.2, avg)));
            hueSeed = (hueSeed + 0.12) % 1;
        }
        lastBass = bass;
        beatPulse *= 0.92;

        for (let i = 0; i < positionAttribute.count; i++) {
            const x = originalPositions[i * 3];
            const z = originalPositions[i * 3 + 2];

            // Spatial weights: low near camera, high far, mid middle
            const depth = (z + planeSize / 2) / planeSize; // 0..1 front→back
            const wLow = Math.max(0, 1 - depth * 3); // stronger near
            const wHigh = Math.max(0, (depth - 0.66) * 3); // stronger far
            const wMid = Math.max(0, 1 - wLow - wHigh);

            const energy = wLow * bassLP * 5 + wMid * mid * 2.8 + wHigh * high * 4;
            const mask = Math.sin(x * 0.15) * Math.cos(z * 0.15);
            const y = -5 + mask * (energy * 1.8);
            positionAttribute.setY(i, y);
        }
        positionAttribute.needsUpdate = true;

        const scale = 1 + bassLP * 0.18 + beatPulse * 0.22;
        sun.scale.set(scale, scale, 1);
        const hue = (hueSeed + bassLP * 0.06) % 1;
        sunMat.color.setHSL(hue, 1, 0.5);
        sun.position.y = 10 + beatPulse * 0.5;

        // Dynamic Outer Circle (Sun Glow)
        const glowScale = 1 + bassLP * 0.4 + beatPulse * 0.3; // More reactive size
        sunGlow.scale.set(glowScale, glowScale, 1);
        sunGlowMat.color.setHSL((hue + 0.05) % 1, 1, 0.5); // Slightly different hue
        sunGlowMat.opacity = 0.2 + bassLP * 0.3; // Dynamic opacity

        particles.rotation.y += 0.0006;
        particles.position.y = bassLP * 0.6;

        // Keep camera static

        composer.render();
    }

    function onResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        composer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onResize);

    animate();
    onReady?.();

    return {
        stop: () => {
            running = false;
            window.removeEventListener('resize', onResize);

            // Dispose of resources
            sunGeo.dispose();
            sunMat.dispose();
            sunGlowGeo.dispose();
            sunGlowMat.dispose();
            geometry.dispose();
            material.dispose();
            particlesGeo.dispose();
            particlesMat.dispose();

            renderer.dispose();
            composer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        },
        onClick: () => {
            // Change color palette on click?
            material.emissive.setHex(Math.random() * 0xffffff);
        }
    };
}
