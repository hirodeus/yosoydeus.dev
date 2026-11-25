// Visual 2 — Motherboard
// Exports createScene; also attaches to window.Visuals.Motherboard for non-module fallback
import * as THREE from 'three';

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
  // Vista zenital (top-down)
  camera.position.set(0, 6.5, 0.1);
  camera.lookAt(0,0,0);
  camera.rotation.x = -Math.PI/2;
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  // Color palette greens/cyans/yellows
  const palette = [0x16ff7d, 0x14e1c5, 0xaefc47, 0x19f7ff];

  // Grid-based graph lines
  const layerCount = quality === 'low' ? 2 : 4;
  const group = new THREE.Group();
  scene.add(group);

  // Almacenar posiciones de nodos para conexiones dinámicas
  const nodePositions = [];

  for (let l=0; l<layerCount; l++) {
    const depth = -l * 0.6;
    const cols = quality === 'low' ? 16 : 28;
    const rows = quality === 'low' ? 16 : 28;
    const spacing = 0.6;
    const lineMat = new THREE.LineBasicMaterial({ color: palette[l % palette.length] });
    const nodes = new THREE.Group();

    // Make grid lines
    const geo = new THREE.BufferGeometry();
    const points = [];
    for (let i=0; i<=rows; i++) {
      points.push(new THREE.Vector3(-cols*spacing/2, 0, depth - rows*spacing/2 + i*spacing));
      points.push(new THREE.Vector3(cols*spacing/2, 0, depth - rows*spacing/2 + i*spacing));
    }
    for (let j=0; j<=cols; j++) {
      points.push(new THREE.Vector3(-cols*spacing/2 + j*spacing, 0, depth - rows*spacing/2));
      points.push(new THREE.Vector3(-cols*spacing/2 + j*spacing, 0, depth + rows*spacing/2));
    }
    geo.setFromPoints(points);
    const lines = new THREE.LineSegments(geo, lineMat);

    // Nodes at intersections
    const nodeGeo = new THREE.SphereGeometry(quality === 'low' ? 0.03 : 0.02, 6, 6);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffa0 });
    for (let i=0;i<=rows;i++) {
      for (let j=0;j<=cols;j++) {
        const n = new THREE.Mesh(nodeGeo, nodeMat);
        n.position.set(-cols*spacing/2 + j*spacing, 0, depth - rows*spacing/2 + i*spacing);
        nodes.add(n);
        nodePositions.push(n.position.clone());
      }
    }

    const layer = new THREE.Group();
    layer.add(lines); layer.add(nodes);
    group.add(layer);
  }

  // Conexiones dinámicas (patrones de motherboard) controladas por audio
  const connectionGroup = new THREE.Group();
  scene.add(connectionGroup);
  const maxConnections = quality === 'low' ? 12 : 24;
  const connections = [];
  for (let i=0;i<maxConnections;i++) {
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: palette[i % palette.length], transparent: true, opacity: 0.85 });
    const line = new THREE.Line(lineGeo, lineMat);
    connectionGroup.add(line);
    connections.push({ line, life: 0, speed: 0.0 });
  }

  // Flow glow traveling along traces
  let flowT = 0; let running = false; let lastT = performance.now(); let autoRotate = false;
  // Parámetros ajustables
  const params = {
    pulseStrength: 1.0,
    connectionMax: maxConnections,
    connectionSpeed: 1.0,
    autoRotateSpeed: 0.0015,
    nodeScale: 0.8,
    lineOpacityBase: 0.6,
  };
  function animate(t){ if (!running) return; requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT)/1000); lastT = t;
    const bands = audioManager.getFrequencyBands();
    const speed = 0.6 + bands.low*2.0;
    flowT += dt * speed;
  
    // Actualizar colores de las líneas y pulsos en nodos
    group.children.forEach((layer, idx) => {
      const lines = layer.children[0]; const nodes = layer.children[1];
      const c = new THREE.Color(palette[idx % palette.length]);
      const bright = 0.5 + bands.low*0.5;
      const hueShift = (flowT*0.02 + bands.mid*0.05) % 1;
      c.offsetHSL(hueShift*0.05, 0.0, (bright-0.5)*0.2);
      lines.material.color.copy(c);
      lines.material.opacity = params.lineOpacityBase + bands.low*0.4; // brillo base + reactivo
      const pulseIndex = Math.floor((flowT*20 + idx*7) % nodes.children.length);
      nodes.children.forEach((n, i) => {
        const d = Math.abs(pulseIndex - i);
        const v = Math.max(0, 1 - d*0.02) * (0.6 + bands.high*0.8) * params.pulseStrength;
        n.scale.setScalar(params.nodeScale + v*0.6);
        // onda viva: elevación sutil con mid/high y fase dependiente de posición
        const waveAmp = (0.02 + bands.mid*0.08 + bands.high*0.04) * params.pulseStrength;
        const phase = flowT*2.0 + (n.position.x + n.position.z)*0.7 + idx*0.5;
        n.position.y = waveAmp * Math.sin(phase);
      });
    });
  
    // Generar y actualizar conexiones dinámicas según energía en mid/high
    const spawnRate = Math.floor((bands.mid*8) + (bands.high*6));
    const spawnAttempts = Math.min(spawnRate, Math.floor(params.connectionMax));
    for (let s=0; s<spawnAttempts; s++) {
      const c = connections.find(c=>c.life<=0.0);
      if (!c || nodePositions.length < 2) break;
      const a = nodePositions[(Math.random()*nodePositions.length)|0];
      const b = nodePositions[(Math.random()*nodePositions.length)|0];
      const pos = c.line.geometry.attributes.position;
      pos.array[0]=a.x; pos.array[1]=a.y; pos.array[2]=a.z;
      pos.array[3]=b.x; pos.array[4]=b.y; pos.array[5]=b.z;
      pos.needsUpdate = true;
      c.life = 1.0; c.speed = (0.8 + bands.mid*1.2) * params.connectionSpeed;
      const lc = new THREE.Color(0x00ffaa);
      lc.offsetHSL((flowT*0.03)%1 * 0.08, 0.2, bands.high*0.2);
      c.line.material.color.copy(lc);
      c.line.material.opacity = 0.8;
    }
    connections.forEach(c=>{
      if (c.life>0) {
        c.life -= dt * c.speed;
        c.line.material.opacity = Math.max(0, c.life*0.8);
      } else {
        c.line.material.opacity = 0.0;
      }
    });
  
    // Vista zenital mantiene la cámara estable; ligera variación y autorrotación opcional
    camera.position.y = 6.5 + Math.sin(flowT*0.5)*0.2;
    if (autoRotate) camera.rotation.z += params.autoRotateSpeed;
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
    dispose(){ running = false; window.removeEventListener('resize', onResize); renderer.dispose(); if (renderer && renderer.domElement && renderer.domElement.parentNode === container) { container.removeChild(renderer.domElement); } },
    onClick(){ /* Las conexiones ya reaccionan al high; mantener simple */ },
    setAutoRotate(v){ autoRotate = !!v; },
    pause(){}, resume(){},
    setParams(p){
      if (!p || typeof p !== 'object') return;
      const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
      if (p.pulseStrength != null) params.pulseStrength = clamp(Number(p.pulseStrength)||0, 0.2, 2.5);
      if (p.connectionMax != null) params.connectionMax = clamp(Number(p.connectionMax)||0, 6, 40);
      if (p.connectionSpeed != null) params.connectionSpeed = clamp(Number(p.connectionSpeed)||0, 0.2, 2.5);
      if (p.autoRotateSpeed != null) params.autoRotateSpeed = clamp(Number(p.autoRotateSpeed)||0, 0.0, 0.01);
      if (p.nodeScale != null) params.nodeScale = clamp(Number(p.nodeScale)||0, 0.4, 1.6);
      if (p.lineOpacityBase != null) params.lineOpacityBase = clamp(Number(p.lineOpacityBase)||0, 0.2, 0.95);
    },
    getDefaultParams(){ return { ...params }; },
  };
  return api;
}

// Fallback global attach for non-module environments
window.Visuals = window.Visuals || {};
window.Visuals.Motherboard = createScene;