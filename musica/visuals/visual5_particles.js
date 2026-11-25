// Visual 5 — Partículas que siguen el dedo/mouse
// Enjambre de partículas que persigue el puntero y late con la música.
import * as THREE from 'three';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.05);
  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  const COUNT = quality === 'low' ? 900 : 2600;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  const phases = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Soft round sprite via canvas texture
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  const sctx = spriteCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  const mat = new THREE.PointsMaterial({
    size: 0.28,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Pointer tracking (mouse + touch), projected onto the z=0 plane
  const target = new THREE.Vector3(0, 0, 0);
  let pointerActive = false;
  let idleT = 0;
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  function updateTarget(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) target.copy(hit);
    pointerActive = true;
    idleT = 0;
  }

  const onPointerMove = (e) => updateTarget(e.clientX, e.clientY);
  const onTouchMove = (e) => { if (e.touches[0]) updateTarget(e.touches[0].clientX, e.touches[0].clientY); };
  let burst = 0;
  const onPointerDown = (e) => { updateTarget(e.clientX, e.clientY); burst = 1.0; };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });

  let running = false;
  let lastT = performance.now();
  const color = new THREE.Color();

  function animate(t) {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    idleT += dt;
    burst *= 0.94;

    const { low, mid, high } = audioManager.getFrequencyBands();

    // If the pointer is idle, the swarm orbits a slow lissajous path
    if (idleT > 2.5) {
      pointerActive = false;
      target.set(Math.sin(t * 0.0004) * 6, Math.cos(t * 0.0006) * 3.5, 0);
    }

    const attract = (pointerActive ? 8.0 : 3.0) + low * 10.0;
    const jitter = 0.4 + high * 3.2 + burst * 5.0;
    const damp = 0.92 - mid * 0.03;

    const pos = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const dx = target.x - pos[ix];
      const dy = target.y - pos[ix + 1];
      const dz = -pos[ix + 2] * 0.4;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

      // Attraction + orbital swirl + audio jitter
      const swirl = 1.6 + mid * 4.0;
      velocities[ix]     += (dx / dist * attract - dy / dist * swirl) * dt + (Math.random() - 0.5) * jitter * dt;
      velocities[ix + 1] += (dy / dist * attract + dx / dist * swirl) * dt + (Math.random() - 0.5) * jitter * dt;
      velocities[ix + 2] += dz * dt + (Math.random() - 0.5) * jitter * 0.3 * dt;

      // Click burst: shove outwards
      if (burst > 0.5) {
        velocities[ix] -= (dx / dist) * burst * 18 * dt;
        velocities[ix + 1] -= (dy / dist) * burst * 18 * dt;
      }

      velocities[ix] *= damp; velocities[ix + 1] *= damp; velocities[ix + 2] *= damp;
      pos[ix] += velocities[ix] * dt * 8;
      pos[ix + 1] += velocities[ix + 1] * dt * 8;
      pos[ix + 2] += velocities[ix + 2] * dt * 8;

      // Color: hue by distance to target + audio, brightness pulses with bass
      const hue = (0.5 + Math.min(0.3, dist * 0.02) + mid * 0.15 + Math.sin(phases[i] + t * 0.001) * 0.04) % 1;
      color.setHSL(hue, 0.85, 0.35 + low * 0.35 + burst * 0.2);
      colors[ix] = color.r; colors[ix + 1] = color.g; colors[ix + 2] = color.b;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    mat.size = 0.22 + low * 0.35 + burst * 0.15;

    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    start() { running = true; lastT = performance.now(); requestAnimationFrame(animate); onReady?.(); },
    stop() { running = false; },
    dispose() {
      running = false;
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      geo.dispose(); mat.dispose(); sprite.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
    onClick() { burst = 1.0; },
    setAutoRotate() {},
    pause() {}, resume() {}
  };
}

window.Visuals = window.Visuals || {};
window.Visuals.Particles = createScene;
