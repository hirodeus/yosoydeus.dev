// Visual 6 — Orbes con gravedad
// Esferas que puedes agarrar y aventar; rebotan y brillan al ritmo del bajo.
import * as THREE from 'three';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  // World bounds: visible area at z=0
  const bounds = { x: 9, y: 5.5 };
  function computeBounds() {
    const dist = camera.position.z;
    const vFov = (camera.fov * Math.PI) / 180;
    bounds.y = Math.tan(vFov / 2) * dist * 0.92;
    bounds.x = bounds.y * camera.aspect * 0.92;
  }
  computeBounds();

  const ORB_COUNT = quality === 'low' ? 8 : 14;
  const orbs = [];
  const detail = quality === 'low' ? 1 : 2;
  const baseGeo = new THREE.IcosahedronGeometry(1, detail);

  for (let i = 0; i < ORB_COUNT; i++) {
    const radius = 0.5 + Math.random() * 0.9;
    const hue = i / ORB_COUNT;
    const color = new THREE.Color().setHSL(hue, 0.9, 0.55);

    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(baseGeo, mat);
    mesh.scale.setScalar(radius);
    mesh.position.set((Math.random() - 0.5) * bounds.x * 1.6, (Math.random() - 0.5) * bounds.y * 1.6, 0);

    // Inner glow core
    const coreMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
    const core = new THREE.Mesh(baseGeo, coreMat);
    core.scale.setScalar(0.55);
    mesh.add(core);

    scene.add(mesh);
    orbs.push({
      mesh, core, radius, hue, baseColor: color.clone(),
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      spinX: (Math.random() - 0.5) * 1.5, spinY: (Math.random() - 0.5) * 1.5,
      flash: 0, grabbed: false
    });
  }

  // ---- Pointer physics: grab & throw ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hitPoint = new THREE.Vector3();
  let grabbed = null;
  let lastPointer = { x: 0, y: 0, t: 0 };
  let throwVel = { x: 0, y: 0 };

  function pointerToWorld(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    raycaster.ray.intersectPlane(plane, hitPoint);
    return hitPoint;
  }

  function onDown(e) {
    const p = pointerToWorld(e.clientX, e.clientY);
    // Pick the closest orb within grab distance
    let best = null, bestDist = Infinity;
    orbs.forEach(o => {
      const d = Math.hypot(o.mesh.position.x - p.x, o.mesh.position.y - p.y);
      if (d < o.radius * 2.2 && d < bestDist) { best = o; bestDist = d; }
    });
    if (best) {
      grabbed = best;
      best.grabbed = true;
      best.flash = 1;
      lastPointer = { x: p.x, y: p.y, t: performance.now() };
      throwVel = { x: 0, y: 0 };
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }

  function onMove(e) {
    if (!grabbed) return;
    const p = pointerToWorld(e.clientX, e.clientY);
    const now = performance.now();
    const dt = Math.max(0.008, (now - lastPointer.t) / 1000);
    throwVel.x = (p.x - lastPointer.x) / dt;
    throwVel.y = (p.y - lastPointer.y) / dt;
    grabbed.mesh.position.x = p.x;
    grabbed.mesh.position.y = p.y;
    lastPointer = { x: p.x, y: p.y, t: now };
  }

  function onUp(e) {
    if (!grabbed) return;
    // Throw! (clamped so it stays controllable)
    grabbed.vx = Math.max(-30, Math.min(30, throwVel.x));
    grabbed.vy = Math.max(-30, Math.min(30, throwVel.y));
    grabbed.grabbed = false;
    grabbed = null;
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointercancel', onUp);
  renderer.domElement.style.touchAction = 'none';

  let running = false;
  let lastT = performance.now();
  let beatCooldown = 0;
  const tmpColor = new THREE.Color();

  function animate(t) {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    const { low, mid, high } = audioManager.getFrequencyBands();

    // Beat impulse: strong bass kicks orbs upward a bit
    beatCooldown -= dt;
    const beat = low > 0.55 && beatCooldown <= 0;
    if (beat) beatCooldown = 0.22;

    orbs.forEach(o => {
      if (!o.grabbed) {
        // Gravity + audio lift
        o.vy -= 9.0 * dt;
        if (beat) { o.vy += 2.5 + Math.random() * 3.0; o.flash = Math.max(o.flash, 0.8); }

        o.vx *= 0.995; o.vy *= 0.995;
        o.mesh.position.x += o.vx * dt;
        o.mesh.position.y += o.vy * dt;

        // Bounce on walls/floor/ceiling
        const r = o.radius;
        if (o.mesh.position.x > bounds.x - r) { o.mesh.position.x = bounds.x - r; o.vx = -Math.abs(o.vx) * 0.85; o.flash = Math.max(o.flash, 0.5); }
        if (o.mesh.position.x < -bounds.x + r) { o.mesh.position.x = -bounds.x + r; o.vx = Math.abs(o.vx) * 0.85; o.flash = Math.max(o.flash, 0.5); }
        if (o.mesh.position.y < -bounds.y + r) { o.mesh.position.y = -bounds.y + r; o.vy = Math.abs(o.vy) * 0.82; o.flash = Math.max(o.flash, 0.6); }
        if (o.mesh.position.y > bounds.y - r) { o.mesh.position.y = bounds.y - r; o.vy = -Math.abs(o.vy) * 0.85; }
      }

      // Orb-orb collisions (simple elastic push)
      orbs.forEach(other => {
        if (other === o) return;
        const dx = other.mesh.position.x - o.mesh.position.x;
        const dy = other.mesh.position.y - o.mesh.position.y;
        const d = Math.hypot(dx, dy);
        const minD = (o.radius + other.radius) * 0.9;
        if (d > 0.001 && d < minD) {
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          if (!o.grabbed) { o.mesh.position.x -= nx * push; o.mesh.position.y -= ny * push; o.vx -= nx * push * 8; o.vy -= ny * push * 8; }
          if (!other.grabbed) { other.mesh.position.x += nx * push; other.mesh.position.y += ny * push; other.vx += nx * push * 8; other.vy += ny * push * 8; }
          o.flash = Math.max(o.flash, 0.35); other.flash = Math.max(other.flash, 0.35);
        }
      });

      // Visual response
      o.flash *= 0.93;
      o.mesh.rotation.x += (o.spinX + mid * 2) * dt;
      o.mesh.rotation.y += (o.spinY + high * 3) * dt;
      const pulse = 1 + low * 0.28 + o.flash * 0.35;
      o.mesh.scale.setScalar(o.radius * pulse);

      tmpColor.copy(o.baseColor).offsetHSL(mid * 0.08, 0, o.flash * 0.25 + low * 0.1);
      o.mesh.material.color.copy(tmpColor);
      o.core.material.color.copy(tmpColor);
      o.core.material.opacity = 0.18 + low * 0.35 + o.flash * 0.4;
    });

    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    computeBounds();
  }
  window.addEventListener('resize', onResize);

  return {
    start() { running = true; lastT = performance.now(); requestAnimationFrame(animate); onReady?.(); },
    stop() { running = false; },
    dispose() {
      running = false;
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointercancel', onUp);
      orbs.forEach(o => { o.mesh.material.dispose(); o.core.material.dispose(); });
      baseGeo.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
    onClick() { orbs.forEach(o => { o.vy += 4 + Math.random() * 4; o.flash = 1; }); },
    setAutoRotate() {},
    pause() {}, resume() {}
  };
}

window.Visuals = window.Visuals || {};
window.Visuals.Orbs = createScene;
