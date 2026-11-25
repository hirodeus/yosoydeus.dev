// Visual 3 — Morpher
// Exports createScene; also attaches to window.Visuals.Morpher for non-module fallback
import * as THREE from 'three';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 0.8, 3.2);
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  // Geometry
  const detail = quality === 'low' ? 1 : 2;
  const geo = new THREE.IcosahedronGeometry(1.0, detail);
  const pos = geo.attributes.position;
  const basePos = pos.array.slice();

  const mat = new THREE.MeshBasicMaterial({ color: 0x29ffc6, wireframe: true });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  let running = false; let lastT = performance.now(); let autoRotate = false; let dragging = false; let mx=0, my=0;
  let clickBoost = 0.0; // impulso temporal por clic
  let burst = 0.0; // acumulador de explosión por altas y clic

  function onMouseDown(e){ dragging = true; clickBoost = 0.6; burst = Math.min(1.0, burst + 0.6); }
  function onMouseUp(){ dragging = false; }
  function onMouseMove(e){ if (!dragging) return; mx += (e.movementX||0)*0.002; my += (e.movementY||0)*0.002; }
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  function animate(t){ if (!running) return; requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT)/1000); lastT = t;
    const bands = audioManager.getFrequencyBands();
    const low = bands.low; const mid = bands.mid; const high = bands.high;

    // Decaimiento del impulso de clic y explosión
    clickBoost *= 0.92;
    burst = Math.max(burst*0.92, high*0.45 + clickBoost*0.8);

    // Global scale/pulse via low
    const baseScale = 1.0 + low*0.25 + clickBoost*0.1;
    mesh.scale.setScalar(baseScale);

    // Morph: combinación de detalle (mid), picos (high) y explosión
    for (let i=0;i<pos.count;i++) {
      const ix = i*3;
      const vx = basePos[ix], vy = basePos[ix+1], vz = basePos[ix+2];
      const r = Math.sqrt(vx*vx + vy*vy + vz*vz);
      const noise = Math.sin(t*0.003 + vx*2.1) * Math.sin(t*0.002 + vy*2.3) * Math.sin(t*0.004 + vz*2.0);
      const disp = (0.12 + low*0.18) + (mid*0.35) + clickBoost*0.25;
      const spike = (high*0.45) + (burst*0.6);
      const s = Math.abs(noise) * (0.25 + high*0.35 + burst*0.4);
      const f = 1.0 + disp + spike + s;
      pos.array[ix] = vx * f;
      pos.array[ix+1] = vy * f;
      pos.array[ix+2] = vz * f;
    }
    pos.needsUpdate = true;

    // Emissive flicker mimic via color lightness
    const c = new THREE.Color(0x29ffc6);
    c.offsetHSL(0.02*mid + clickBoost*0.05 + burst*0.03, 0.0, (high-0.5)*0.12);
    mat.color.copy(c);

    // Auto-rotate y drag interaction
    mesh.rotation.y += autoRotate ? 0.005 : 0.0;
    mesh.rotation.y += mx * 0.02; mx *= 0.95;
    mesh.rotation.x += my * 0.02; my *= 0.95;

    renderer.render(scene, camera);
  }

  function onResize(){
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  const api = {
    start(){ running = true; requestAnimationFrame(animate); onReady?.(); },
    stop(){ running = false; },
    dispose(){ running = false; window.removeEventListener('resize', onResize); renderer.domElement.removeEventListener('mousedown', onMouseDown); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('mousemove', onMouseMove); renderer.dispose(); if (renderer && renderer.domElement && renderer.domElement.parentNode === container) { container.removeChild(renderer.domElement); } },
    onClick(){ clickBoost = 0.8; },
    setAutoRotate(v){ autoRotate = !!v; },
    pause(){}, resume(){},
  };
  return api;
}

// Fallback global attach for non-module environments
window.Visuals = window.Visuals || {};
window.Visuals.Morpher = createScene;