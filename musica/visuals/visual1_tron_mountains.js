// visual1_tron_mountains.js
// Neon wireframe mountain range with audio-reactive displacement
import * as THREE from 'three';

// Visual 1 — TronMountains
// Exports createScene; also attaches to window.Visuals.TronMountains for non-module fallback

export async function createScene({ container, audioManager, quality = 'high', onReady }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, 250);
  camera.position.set(0, 3.8, 7.2);
  camera.lookAt(0, 1.2, -4);
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);

  // Iluminación ligera para volumen sin coste alto
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.45);
  dirLight.position.set(3, 5, 2);
  scene.add(dirLight);

  // Grid plane for mountains
  const cols = quality === 'low' ? 64 : 128;
  const rows = quality === 'low' ? 64 : 128;
  const geo = new THREE.PlaneGeometry(40, 40, cols, rows);
  geo.rotateX(-Math.PI/2);

  const verts = geo.attributes.position;
  const basePositions = verts.array.slice();

  // Compute z bounds and span for wrapping (infinite loop)
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 2; i < basePositions.length; i += 3) {
    const z = basePositions[i];
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  const zSpan = zMax - zMin;

  // Material con opacidad y respuesta a luz para un look menos sólido
  const mat = new THREE.MeshLambertMaterial({
    color: 0x19e3ff,
    transparent: true,
    opacity: 0.22,
    emissive: new THREE.Color(0x081a1f),
  });
  // Tile the terrain (3 segments) to ensure continuous coverage in Z
  const baseZ = -22;
  const terrainTiles = [];
  for (let k = -1; k <= 1; k++) {
    const m = new THREE.Mesh(geo, mat);
    m.position.z = baseZ + k * zSpan;
    terrainTiles.push(m);
    scene.add(m);
  }

  // Construct custom wireframe: X-direction ridge lines + diagonal lines for depth
  const idx = (i, j) => j * (cols + 1) + i; // vertex index in grid
  const xSegments = (rows + 1) * cols;
  const diagSegments = rows * cols; // one diagonal per cell (i,j)->(i+1,j+1)

  // Base lines
  const xLinePos = new Float32Array(xSegments * 6);
  const xLinesGeo = new THREE.BufferGeometry();
  xLinesGeo.setAttribute('position', new THREE.BufferAttribute(xLinePos, 3));
  const lineMatBase = new THREE.LineBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.8, fog: true, depthTest: true });
  // Glow lines (additive) — subtle neon effect
  const xLinePosGlow = new Float32Array(xSegments * 6);
  const xLinesGeoGlow = new THREE.BufferGeometry();
  xLinesGeoGlow.setAttribute('position', new THREE.BufferAttribute(xLinePosGlow, 3));
  const lineMatGlow = new THREE.LineBasicMaterial({ color: 0x3cf9ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });

  // Diagonal lines
  const diagLinePos = new Float32Array(diagSegments * 6);
  const diagLinesGeo = new THREE.BufferGeometry();
  diagLinesGeo.setAttribute('position', new THREE.BufferAttribute(diagLinePos, 3));
  const diagMat = new THREE.LineBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.5, fog: true });

  function updateWireLines() {
    // X-direction lines
    let p = 0, pg = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = idx(i, j) * 3;
        const b = idx(i + 1, j) * 3;
        // point A
        xLinePos[p++] = verts.array[a];
        xLinePos[p++] = verts.array[a + 1];
        xLinePos[p++] = verts.array[a + 2];
        xLinePosGlow[pg++] = verts.array[a];
        xLinePosGlow[pg++] = verts.array[a + 1];
        xLinePosGlow[pg++] = verts.array[a + 2];
        // point B
        xLinePos[p++] = verts.array[b];
        xLinePos[p++] = verts.array[b + 1];
        xLinePos[p++] = verts.array[b + 2];
        xLinePosGlow[pg++] = verts.array[b];
        xLinePosGlow[pg++] = verts.array[b + 1];
        xLinePosGlow[pg++] = verts.array[b + 2];
      }
    }
    xLinesGeo.attributes.position.needsUpdate = true;
    xLinesGeoGlow.attributes.position.needsUpdate = true;

    // Diagonal lines (i,j) -> (i+1, j+1)
    let q = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = idx(i, j) * 3;
        const b = idx(i + 1, j + 1) * 3;
        diagLinePos[q++] = verts.array[a];
        diagLinePos[q++] = verts.array[a + 1];
        diagLinePos[q++] = verts.array[a + 2];
        diagLinePos[q++] = verts.array[b];
        diagLinePos[q++] = verts.array[b + 1];
        diagLinePos[q++] = verts.array[b + 2];
      }
    }
    diagLinesGeo.attributes.position.needsUpdate = true;
  }

  // Attach the line segments to each terrain tile so they inherit tile transforms
  terrainTiles.forEach((m) => {
    const linesBase = new THREE.LineSegments(xLinesGeo, lineMatBase);
    const linesGlow = new THREE.LineSegments(xLinesGeoGlow, lineMatGlow);
    const linesDiag = new THREE.LineSegments(diagLinesGeo, diagMat);
    m.add(linesBase);
    m.add(linesGlow);
    m.add(linesDiag);
  });
  // Initial fill
  updateWireLines();

  // Profundidad atmosférica para sentir viaje
  scene.fog = new THREE.Fog(0x0b0f14, 18, 85);

  // Parámetros ajustables del efecto
  const params = {
    forwardBase: 5.4,
    forwardAudioBass: 0.35,
    forwardAudioMid: 0.12,
    parallaxYawScale: 0.12,
    parallaxPitchScale: 0.06,
    ridgeScale: 0.75,
    valleyDepth: 0.38,
    fogNear: 8,
    fogFar: 42,
    hueBase: 0.55,
    hueTravel: 0.10,
    // Apariencia
    fillOpacity: 0.22,
    glowBase: 0.28,
    glowGain: 0.45,
    // Parámetros de la nave
    shipClearance: 0.9,
    shipSpringK: 2.0,
    shipDamping: 1.2,
    shipControlSensitivity: 2.6,
    shipMaxRoll: 0.5,
    // Corredor de vuelo y cámara
    corridorHalf: 3.0,      // mitad del ancho del corredor de evaluación
    aheadStart: -3.0,       // inicio del muestreo (cerca de la nave, hacia -Z)
    aheadEnd: -12.0,        // fin del muestreo (más lejos)
    aheadStep: 1.0,         // paso en Z para muestreo
    cameraOffsetY: 1.2,     // altura adicional de cámara sobre la nave
    nearMargin: 0.4,        // margen mínimo para evitar clipping cercano
  };

  // Small flashes (sprites) for highs
  const pulseGroup = new THREE.Group();
  scene.add(pulseGroup);
  const flashCount = quality === 'low' ? 40 : 100;
  const flashGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x7afcff });
  for (let i=0;i<flashCount;i++) {
    const m = new THREE.Mesh(flashGeo, flashMat);
    m.position.set((Math.random()-0.5)*25, 0.05 + Math.random()*0.2, -Math.random()*25);
    pulseGroup.add(m);
  }

  // Nave: diseño estilizado tipo delta con nariz apuntando hacia -Z
  const ship = new THREE.Group();
  const shipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  // Fuselaje
  const fuselageGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.9, 16);
  const fuselage = new THREE.Mesh(fuselageGeo, shipMat);
  fuselage.rotation.x = -Math.PI/2; // alinear eje con Z
  fuselage.position.z = -0.1;
  // Nariz (punta) hacia -Z
  const noseGeo = new THREE.ConeGeometry(0.10, 0.35, 14);
  const nose = new THREE.Mesh(noseGeo, shipMat);
  nose.rotation.x = -Math.PI/2; nose.position.z = -0.55;
  // Cabina
  const canopyGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const canopy = new THREE.Mesh(canopyGeo, shipMat);
  canopy.position.set(0, 0.05, -0.15);
  // Alas delta
  const wingGeo = new THREE.BoxGeometry(0.7, 0.02, 0.25);
  const wingL = new THREE.Mesh(wingGeo, shipMat); wingL.position.set(-0.35, -0.05, -0.05); wingL.rotation.y = 0.15;
  const wingR = new THREE.Mesh(wingGeo, shipMat); wingR.position.set(0.35, -0.05, -0.05); wingR.rotation.y = -0.15;
  // Cola/boquilla
  const engineGeo = new THREE.TorusGeometry(0.10, 0.02, 8, 20);
  const engine = new THREE.Mesh(engineGeo, shipMat); engine.rotation.x = Math.PI/2; engine.position.z = 0.45;
  ship.add(fuselage, nose, canopy, wingL, wingR, engine);
  ship.position.set(0, 1.6, -2.2);
  scene.add(ship);

  // Grupo de partículas de escape/estela
  const exhaustGroup = new THREE.Group();
  scene.add(exhaustGroup);

  // Camera parallax
  let targetYaw = 0, targetPitch = 0;
  function onMouse(e){
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    targetYaw = x * params.parallaxYawScale; // parallax configurable
    targetPitch = y * params.parallaxPitchScale;
    targetShipX = x * params.shipControlSensitivity;
  }
  window.addEventListener('mousemove', onMouse);

  // Click particle burst
  // Partículas de burst con trazas (línea entre posición previa y actual)
  const bursts = [];
  function spawnBurst(){
    const count = 28;
    for (let i=0;i<count;i++){
      const g = new THREE.SphereGeometry(0.04 + Math.random()*0.08, 8, 8);
      const m = new THREE.MeshBasicMaterial({ color: 0x29ffc6, transparent: true, opacity: 0.9 });
      const b = new THREE.Mesh(g, m);
      b.position.copy(ship.position).add(new THREE.Vector3(0, -0.05, -0.3));
      const dir = new THREE.Vector3((Math.random()-0.5)*0.6, Math.random()*0.6, -0.6 - Math.random()*0.6).normalize();
      b.userData.v = dir.multiplyScalar(0.6 + Math.random()*1.2);
      b.userData.life = 0.8 + Math.random()*0.6;
      // Traza como línea entre prev y curr
      const lineGeo = new THREE.BufferGeometry().setFromPoints([b.position.clone(), b.position.clone()]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x66fff0, transparent:true, opacity:0.8 });
      const line = new THREE.Line(lineGeo, lineMat);
      b.userData.line = line; scene.add(line);
      bursts.push(b); scene.add(b);
    }
  }
  function onClick(){ spawnBurst(); }

  // Resize
  function onResize(){
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  let running = false; let autoRotate = false; let lastT = performance.now();
  let timeOffset = 0; // Para movimiento cíclico infinito
  let camBob = 0; // oscilación sutil de cámara para sensación de nave
  // Estado de movimiento de la nave
  let targetShipX = 0; let shipVy = 0; let shipY = 1.6;
  const raycaster = new THREE.Raycaster();

  function animate(t){ if (!running) return; requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - lastT)/1000); lastT = t;
    const bands = audioManager.getFrequencyBands();
    
    // Incrementar offset de tiempo para evolución de relieve (no traslación)
    timeOffset += dt * 1.6; // ritmo del relieve (más sutil)

    // Helper para picos más afilados (ridged)
    const ridged = (v) => { const s = Math.sin(v); return s >= 0 ? Math.pow(s, 3) : -Math.pow(-s, 3); };
    // Forward motion simulated by shifting z y altura con bass/mid
    const bass = bands.low; const mid = bands.mid; const high = bands.high;
    for (let i=0;i<verts.count;i++) {
      const ix = i*3;
      const x = basePositions[ix];
      const worldZ = basePositions[ix+2] - timeOffset; // el relieve se desplaza levemente hacia delante
      let zWrapped = zMin + (((worldZ - zMin) % zSpan) + zSpan) % zSpan;

      // Ondas afiladas tipo cresta
      const r1 = ridged(x*0.38 + worldZ*0.55);
      const r2 = ridged(worldZ*0.72 + x*0.22);
      const r3 = ridged(x*0.17 + worldZ*0.95);
      const h = r1*0.7 + r2*0.5 + Math.abs(r3)*0.6;

      // Influencia configurable de bajos/medios sobre la altura
      const amp = 0.8 + bass * (1.6 * params.forwardAudioBass) + mid * (0.9 * params.forwardAudioMid);
      // Corredor: subir más los bordes para formar riscos y mantener valle central
      const edgeRise = (1.0 + Math.pow(Math.abs(x)/20, 2.4) * 2.8) * params.ridgeScale;
      const valley = 1.0 - Math.exp(-Math.pow(x/6, 2)) * (0.35 * params.valleyDepth);
      const mountainFactor = (1.8 + amp*2.4) * edgeRise * valley;
      verts.array[ix] = x;
      verts.array[ix+1] = h * mountainFactor + 0.08; // base ligeramente más alta
      verts.array[ix+2] = zWrapped;
    }
    verts.needsUpdate = true;
    // Update custom wireframe to follow the deformed mesh
    updateWireLines();

    // Función de altura del relieve en (x, z) consistente con el generador
    function heightAt(x, z){
      const worldZ = z - timeOffset;
      const r1 = ridged(x*0.38 + worldZ*0.55);
      const r2 = ridged(worldZ*0.72 + x*0.22);
      const r3 = ridged(x*0.17 + worldZ*0.95);
      const h = r1*0.7 + r2*0.5 + Math.abs(r3)*0.6;
      const amp = 0.8 + bass * (1.6 * params.forwardAudioBass) + mid * (0.9 * params.forwardAudioMid);
      const edgeRise = (1.0 + Math.pow(Math.abs(x)/20, 2.4) * 2.8) * params.ridgeScale;
      const valley = 1.0 - Math.exp(-Math.pow(x/6, 2)) * (0.35 * params.valleyDepth);
      const mountainFactor = (1.8 + amp*2.4) * edgeRise * valley;
      return h * mountainFactor + 0.08;
    }

    // Control lateral por ratón
    ship.position.x += (targetShipX - ship.position.x) * 0.08;
    ship.position.x = Math.max(-12, Math.min(12, ship.position.x));
    
    // Muestreo del corredor de vuelo por delante de la nave (varias X y Z)
    let tallest = -Infinity;
    for (let z = params.aheadStart; z >= params.aheadEnd; z -= params.aheadStep) {
      for (let x = ship.position.x - params.corridorHalf; x <= ship.position.x + params.corridorHalf; x += 1.0) {
        const h = heightAt(x, z);
        if (h > tallest) tallest = h;
      }
    }
    const desiredY = tallest + params.shipClearance;
    const err = shipY - desiredY;
    const acc = -params.shipSpringK * err - params.shipDamping * shipVy;
    shipVy += acc * dt;
    shipY += shipVy * dt;
    ship.position.y = shipY;
    // Actitud de la nave (roll/pitch)
    const roll = Math.max(-params.shipMaxRoll, Math.min(params.shipMaxRoll, ship.position.x * 0.06));
    const pitch = Math.max(-0.35, Math.min(0.35, -shipVy * 0.25));
    ship.rotation.z = roll;
    ship.rotation.x = pitch;

    // Avance frontal del terreno: mover tiles hacia la cámara y hacer loop sin huecos
    const forwardSpeed = (params.forwardBase * (1.0 + bass*params.forwardAudioBass + mid*params.forwardAudioMid)) * dt; // velocidad base + audio
    terrainTiles.forEach((m) => {
      m.position.z += forwardSpeed;
      // Cuando un tile cruza el frente, envíalo atrás del conjunto de 3 para mantener cobertura continua
      if (m.position.z > baseZ + zSpan) {
        m.position.z -= zSpan * 3;
      }
    });

    // Actualizar niebla según parámetros
    scene.fog.near = params.fogNear;
    scene.fog.far = params.fogFar;

    // Color viajero en función del tiempo y energía con control de hue
    const huePhase = (timeOffset * 0.03) % 1;
    const h = (params.hueBase + params.hueTravel * huePhase) % 1;
    const s = 1.0;
    const l = 0.5 + (mid - 0.5) * 0.35;
    const col = new THREE.Color();
    col.setHSL(h, s, l);
    mat.color.copy(col);
    // Opacidad del relleno dinámica para evitar aspecto sólido
    mat.opacity = Math.max(0.08, Math.min(0.4, params.fillOpacity * (0.9 + mid * 0.3)));
    // Lines: keep color in sync but slightly brighter for visibility
    const lineCol = col.clone(); lineCol.offsetHSL(0, 0, 0.2);
    lineMatBase.color.copy(lineCol);
    lineMatGlow.color.copy(lineCol);
    diagMat.color.copy(lineCol);
    // Glow dinámico de líneas — efecto tipo bloom de bajo coste
    lineMatGlow.opacity = Math.max(0.12, Math.min(0.85, params.glowBase + high * params.glowGain));

    // Ajustar color de destellos con el ritmo (anclado al hue base)
    const flashHue = (h + 0.08 + 0.12 * high) % 1;
    const flashColor = new THREE.Color(); flashColor.setHSL(flashHue, 1.0, 0.6);
    flashMat.color.copy(flashColor);

    pulseGroup.children.forEach((m, idx) => {
      m.visible = Math.random() < high*0.7;
      m.position.z += (0.02 + bass*0.06) * (dt * 60); // Normalizar por framerate
      // Reiniciar partículas de forma cíclica
      if (m.position.z > 2) {
        m.position.z = -25 - Math.random() * 5; // Añadir variación en la posición inicial
        m.position.x = (Math.random()-0.5)*25; // Reposicionar en X también
        m.position.y = 0.05 + Math.random()*0.2; // Reposicionar en Y
      }
    });

    // Actualización de bursts con trazas y decaimiento
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const prev = b.position.clone();
      b.position.addScaledVector(b.userData.v, dt * 60);
      b.userData.v.y -= 0.02 * (dt * 60);
      b.userData.life -= dt;
      b.material.opacity = Math.max(0, b.userData.life);
      // actualizar traza
      const p = b.userData.line.geometry.attributes.position;
      p.setXYZ(0, prev.x, prev.y, prev.z);
      p.setXYZ(1, b.position.x, b.position.y, b.position.z);
      p.needsUpdate = true;
      b.userData.line.material.opacity = Math.max(0, b.userData.life * 0.8);
      if (b.userData.life <= 0 || b.position.y < 0) {
        scene.remove(b); b.geometry.dispose(); b.material.dispose();
        scene.remove(b.userData.line); b.userData.line.geometry.dispose(); b.userData.line.material.dispose();
        bursts.splice(i,1);
      }
    }

    // Estela de motor continua (partículas pequeñas con caída rápida)
    const exhaustSpawn = 2; // por frame
    for (let i=0;i<exhaustSpawn;i++){
      const g = new THREE.SphereGeometry(0.02, 6, 6);
      const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent:true, opacity:0.8 });
      const ptl = new THREE.Mesh(g, m);
      ptl.position.copy(ship.position).add(new THREE.Vector3(0, -0.05, 0.35));
      const v = new THREE.Vector3((Math.random()-0.5)*0.06, (Math.random()-0.5)*0.04, 0.25 + Math.random()*0.15);
      ptl.userData = { v, life: 0.5 };
      exhaustGroup.add(ptl);
    }
    for (let i=exhaustGroup.children.length-1;i>=0;i--){
      const ptl = exhaustGroup.children[i];
      ptl.position.addScaledVector(ptl.userData.v, dt * 60);
      ptl.userData.life -= dt;
      ptl.material.opacity = Math.max(0, ptl.userData.life);
      if (ptl.userData.life <= 0) { exhaustGroup.remove(ptl); ptl.geometry.dispose(); ptl.material.dispose(); }
    }

    // Oscilación sutil para simular movimiento de nave
    camBob += dt;
    camera.position.y = ship.position.y + params.cameraOffsetY + Math.sin(camBob*1.2)*0.05; // flotación + seguimiento
    camera.position.x += (ship.position.x*0.3 - camera.position.x) * 0.05;
    camera.position.z = 7.0 + Math.cos(camBob*0.8)*0.03;

    // Guardia: raycast hacia delante para evitar clipping con geometría cercana
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    raycaster.set(camera.position, dir);
    let nearest = null;
    terrainTiles.forEach(m => {
      const hits = raycaster.intersectObject(m, false);
      if (hits && hits.length) {
        const h = hits[0]; if (!nearest || h.distance < nearest.distance) nearest = h;
      }
    });
    if (nearest && nearest.distance < (camera.near + params.nearMargin)) {
      camera.position.y += ((camera.near + params.nearMargin) - nearest.distance);
    }

    // Aplicar parallax correctamente: yaw afecta X, pitch afecta Y del lookTarget
    const lookTarget = new THREE.Vector3(
      ship.position.x + targetYaw * 8.0,  // yaw mueve el objetivo en X
      ship.position.y + 0.2 + targetPitch * 3.0,  // pitch mueve el objetivo en Y
      -6
    );
    camera.lookAt(lookTarget);
    if (autoRotate) camera.rotation.y += 0.002;

    renderer.render(scene, camera);
  }

  const api = {
    start(){ running = true; requestAnimationFrame(animate); onReady?.(); },
    stop(){ running = false; },
    dispose(){ running = false; window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMouse); renderer.dispose(); if (renderer && renderer.domElement && renderer.domElement.parentNode === container) { container.removeChild(renderer.domElement); } },
    onClick,
    setAutoRotate(v){ autoRotate = !!v; },
    pause(){ /* no-op visual pause */ },
    resume(){ /* no-op visual resume */ },
    setParams(p){
      if (!p || typeof p !== 'object') return;
      // Clamp y asignación segura
      const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
      if (p.forwardBase != null) params.forwardBase = clamp(Number(p.forwardBase)||0, 1.0, 20.0);
      if (p.forwardAudioBass != null) params.forwardAudioBass = clamp(Number(p.forwardAudioBass)||0, 0.0, 2.0);
      if (p.forwardAudioMid != null) params.forwardAudioMid = clamp(Number(p.forwardAudioMid)||0, 0.0, 1.5);
      if (p.parallaxYawScale != null) params.parallaxYawScale = clamp(Number(p.parallaxYawScale)||0, 0.0, 0.2);
      if (p.parallaxPitchScale != null) params.parallaxPitchScale = clamp(Number(p.parallaxPitchScale)||0, 0.0, 0.12);
      if (p.ridgeScale != null) params.ridgeScale = clamp(Number(p.ridgeScale)||0, 0.2, 5.0);
      if (p.valleyDepth != null) params.valleyDepth = clamp(Number(p.valleyDepth)||0, 0.3, 3.0);
      if (p.fogNear != null) params.fogNear = clamp(Number(p.fogNear)||0, 4, 60);
      if (p.fogFar != null) params.fogFar = clamp(Number(p.fogFar)||0, 30, 180);
      if (p.hueBase != null) params.hueBase = clamp(Number(p.hueBase)||0, 0.0, 1.0);
      if (p.hueTravel != null) params.hueTravel = clamp(Number(p.hueTravel)||0, 0.0, 0.5);
      // Nave
      if (p.shipClearance != null) params.shipClearance = clamp(Number(p.shipClearance)||0, 0.2, 3.0);
      if (p.shipSpringK != null) params.shipSpringK = clamp(Number(p.shipSpringK)||0, 0.1, 6.0);
      if (p.shipDamping != null) params.shipDamping = clamp(Number(p.shipDamping)||0, 0.0, 3.0);
      if (p.shipControlSensitivity != null) params.shipControlSensitivity = clamp(Number(p.shipControlSensitivity)||0, 0.5, 4.0);
      if (p.shipMaxRoll != null) params.shipMaxRoll = clamp(Number(p.shipMaxRoll)||0, 0.0, 1.0);
      // Corredor/cámara
      if (p.corridorHalf != null) params.corridorHalf = clamp(Number(p.corridorHalf)||0, 1.0, 8.0);
      if (p.aheadStart != null) params.aheadStart = clamp(Number(p.aheadStart)||0, -1.0, -6.0);
      if (p.aheadEnd != null) params.aheadEnd = clamp(Number(p.aheadEnd)||0, -20.0, -6.0);
      if (p.aheadStep != null) params.aheadStep = clamp(Number(p.aheadStep)||0, 0.5, 2.0);
      if (p.cameraOffsetY != null) params.cameraOffsetY = clamp(Number(p.cameraOffsetY)||0, 0.4, 2.0);
      if (p.nearMargin != null) params.nearMargin = clamp(Number(p.nearMargin)||0, 0.1, 1.0);
    },
    getDefaultParams(){ return { ...params }; },
  };
  return api;
}

// Fallback global attach for non-module environments
window.Visuals = window.Visuals || {};
window.Visuals.TronMountains = createScene;