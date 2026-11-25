// Visual 7 — Túnel Warp
// Viaje por un túnel de neón: el mouse/dedo controla la dirección, la música la velocidad.
import * as THREE from 'three';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 10, 90);
  const camera = new THREE.PerspectiveCamera(80, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  const RING_COUNT = quality === 'low' ? 28 : 48;
  const DEPTH = 100;
  const SPACING = DEPTH / RING_COUNT;
  const SEGMENTS = quality === 'low' ? 24 : 40;
  const RADIUS = 6;

  // Shared ring geometry (circle of line segments)
  const ringGeo = new THREE.BufferGeometry();
  {
    const pts = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS, 0));
    }
    ringGeo.setFromPoints(pts);
  }

  const rings = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const mat = new THREE.LineBasicMaterial({ color: 0x29ffc6, transparent: true, opacity: 0.8 });
    const ring = new THREE.Line(ringGeo, mat);
    ring.position.z = -i * SPACING;
    scene.add(ring);
    rings.push({ obj: ring, mat, seed: Math.random() * Math.PI * 2 });
  }

  // Star streaks for warp feel
  const STAR_COUNT = quality === 'low' ? 200 : 500;
  const starPos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = RADIUS * (0.55 + Math.random() * 0.4);
    starPos[i * 3] = Math.cos(a) * r;
    starPos[i * 3 + 1] = Math.sin(a) * r;
    starPos[i * 3 + 2] = -Math.random() * DEPTH;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Pointer steering: normalized -1..1
  const steer = { x: 0, y: 0 };
  const steerTarget = { x: 0, y: 0 };
  function updateSteer(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    steerTarget.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    steerTarget.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  }
  const onPointerMove = (e) => updateSteer(e.clientX, e.clientY);
  const onTouchMove = (e) => { if (e.touches[0]) updateSteer(e.touches[0].clientX, e.touches[0].clientY); };
  let boost = 0;
  const onPointerDown = () => { boost = 1; };
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });

  let running = false;
  let lastT = performance.now();
  let travel = 0;
  const color = new THREE.Color();

  function animate(t) {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    boost *= 0.96;

    const { low, mid, high } = audioManager.getFrequencyBands();

    // Smooth steering
    steer.x += (steerTarget.x - steer.x) * 0.06;
    steer.y += (steerTarget.y - steer.y) * 0.06;

    // Speed: base + bass + click boost
    const speed = 9 + low * 32 + boost * 40;
    travel += speed * dt;

    // Camera subtle tilt toward steering
    camera.rotation.z = -steer.x * 0.25;
    camera.rotation.x = steer.y * 0.12;
    camera.rotation.y = -steer.x * 0.12;

    rings.forEach((r, i) => {
      r.obj.position.z += speed * dt;

      // Respawn behind and re-center on the current steering curve
      if (r.obj.position.z > 2) r.obj.position.z -= DEPTH;

      // Tunnel curvature: rings offset by steering, more the deeper they are
      const depthFactor = Math.min(1, -r.obj.position.z / (DEPTH * 0.6));
      const wob = Math.sin(travel * 0.02 + r.seed) * 0.4;
      r.obj.position.x = steer.x * 7 * depthFactor + wob * depthFactor;
      r.obj.position.y = steer.y * 5 * depthFactor + Math.cos(travel * 0.018 + r.seed) * 0.3 * depthFactor;

      // Pulse: scale with bass, opacity flickers with highs
      const pulse = 1 + low * 0.25 * Math.sin(r.seed + travel * 0.05);
      r.obj.scale.setScalar(pulse);

      const hue = (0.48 + mid * 0.25 + (-r.obj.position.z / DEPTH) * 0.22 + travel * 0.0012) % 1;
      color.setHSL(hue, 0.95, 0.45 + high * 0.25);
      r.mat.color.copy(color);
      r.mat.opacity = 0.35 + 0.5 * (1 - depthFactor) + high * 0.25;
    });

    // Stars rush past
    const sp = starGeo.attributes.position.array;
    for (let i = 0; i < STAR_COUNT; i++) {
      sp[i * 3 + 2] += speed * 1.4 * dt;
      if (sp[i * 3 + 2] > 1) sp[i * 3 + 2] -= DEPTH;
    }
    starGeo.attributes.position.needsUpdate = true;
    starMat.size = 0.06 + low * 0.15 + boost * 0.1;

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
      rings.forEach(r => r.mat.dispose());
      ringGeo.dispose(); starGeo.dispose(); starMat.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
    onClick() { boost = 1; },
    setAutoRotate() {},
    pause() {}, resume() {}
  };
}

window.Visuals = window.Visuals || {};
window.Visuals.Tunnel = createScene;
