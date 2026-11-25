import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { conectarLoopito } from './loopito-link.js';

// --- MIDI PARAM DEFINITIONS ---
const MIDI_PARAMS = [
  { key: 'displacement',     label: 'Desplazamiento 3D',  min: 0,    max: 200, defaultCC: 70 },
  { key: 'audioSensitivity', label: 'Sensibilidad Audio', min: 0,    max: 200, defaultCC: 71 },
  { key: 'turbulence',       label: 'Turbulencia',        min: 0,    max: 5,   defaultCC: 72 },
  { key: 'particleSize',     label: 'Tamaño Partículas',  min: 0.5,  max: 20,  defaultCC: 73 },
  { key: 'brightness',       label: 'Brillo',             min: 0,    max: 2.5, defaultCC: 74 },
  { key: 'orbitSpeed',       label: 'Velocidad Órbita',   min: 0,    max: 1.5, defaultCC: 75 },
  { key: 'cameraFov',        label: 'Campo de Visión',    min: 30,   max: 130, defaultCC: 76 },
  { key: 'zoom',             label: 'Zoom Cámara',        min: 30,   max: 350, defaultCC: 77 },
];

// --- ESTADO BASE: TODO EN CERO ---
// Punto de partida limpio: la imagen se ve tal cual entra, sin efecto alguno.
// Nada se mueve hasta que TÚ subas un fader.
const DEFAULT_SETTINGS = {
  // --- Efectos: en cero duro ---
  displacement: 0,        // sin relieve 3D
  audioSensitivity: 0,    // audio no maneja nada (bass/mid/high quedan en 0)
  turbulence: 0,          // ruido apagado (el step() del shader ni lo calcula)
  orbitSpeed: 0,          // órbita congelada

  // --- Neutros: NO pueden ir en 0 o la imagen desaparece ---
  brightness: 1.0,        // 0 = pantalla negra
  particleSize: 2.0,      // 0 = puntos invisibles
  cameraFov: 75,          // lente estándar
  zoom: 120,              // encuadre que llena el frame

  // --- Calibración de entrada: neutros ---
  inBrightness: 0,        // -0.5 a 0.5
  inContrast: 1.0,        // 0.5 a 2
  inSaturation: 1.0,      // 0 a 2
  inHue: 0,               // -180 a 180 grados

  // --- Fondo: negro absoluto ---
  bgMode: 'black',
  bgColor: '#ffffff',     // solo aplica si activas Estrellas / Grid

  // --- Modos: passthrough ---
  colorMode: 'webcam',    // color original de la cámara
  particleType: 'points',
  cameraPreset: 'default',
  mirror: true,
  beatFx: 'off',          // Loopito: FX que dispara cada tiempo del BPM
  customColorA: '#ff0066',
  customColorB: '#00ffcc'
};

// --- ATLAS DE GLIFOS MATRIX ---
// Rasteriza 64 caracteres en un canvas 512x512 (rejilla 8x8) una sola vez al
// arrancar. El shader lo muestrea con gl_PointCoord → 1 texture lookup por
// fragmento, mucho más barato que generar patrones proceduralmente.
const MATRIX_GRID = 8;
const makeMatrixAtlas = () => {
  const CELL = 64, SIZE = MATRIX_GRID * CELL;
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Set clásico: katakana de media anchura + dígitos + símbolos.
  // Es literalmente lo que usó la película (katakana espejeado).
  const chars = ('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
                 '0123456789' + ':・."=*+-<>¦|╌').split('');

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(CELL * 0.76)}px "MS Gothic", "Yu Gothic", "Meiryo", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < MATRIX_GRID * MATRIX_GRID; i++) {
    const c = chars[i % chars.length];
    const x = (i % MATRIX_GRID) * CELL + CELL / 2;
    const y = Math.floor(i / MATRIX_GRID) * CELL + CELL / 2;
    ctx.fillText(c, x, y);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;              // gl_PointCoord ya viene con Y hacia abajo
  tex.generateMipmaps = false;    // los mips sangran entre celdas del atlas
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
};

// --- FX PADS (momentáneos) ---
// Cada pad dispara una envolvente: salta a 1.0 y decae solo (tau = segundos
// hasta ~37%). Los knobs son el estado base; los pads pintan encima.
const FX_LIST = [
  { key: 'flash',   label: 'FLASH',   tau: 0.13 },
  { key: 'glitch',  label: 'GLITCH',  tau: 0.22 },
  { key: 'tunnel',  label: 'TÚNEL',   tau: 0.35 },
  { key: 'kaleido', label: 'KALEIDO', tau: 0.45 },
  { key: 'ripple',  label: 'ONDA',    tau: 0.55 },
  { key: 'shake',   label: 'SHAKE',   tau: 0.18 },
  { key: 'invert',  label: 'INVERT',  tau: 0.16 },
  { key: 'pixel',   label: 'PIXEL',   tau: 0.30 },
];
// LPD8 PROG 1: pads mandan notas 36-43
const DEFAULT_PAD_MAP = { 36: 0, 37: 1, 38: 2, 39: 3, 40: 4, 41: 5, 42: 6, 43: 7 };

// --- LOOPITO (teléfono) ---
// Acepta "192.168.1.13", "192.168.1.13:8765" o "ws://…". Puerto por defecto 8765.
const loopitoUrl = (ip) => {
  let u = ip.trim().replace(/\/+$/, '');
  if (!/^wss?:\/\//i.test(u)) u = 'ws://' + u;
  if (!/:\d+$/.test(u)) u += ':8765';
  return u;
};
// Una página https no puede abrir ws:// hacia la red local (contenido mixto).
const LOOPITO_HTTPS_MSG = 'Loopito solo funciona con la página abierta por http://localhost, no por https.';

const buildLPD8Mappings = () => {
  const m = {};
  MIDI_PARAMS.forEach(p => { m[p.defaultCC] = { param: p.key, min: p.min, max: p.max }; });
  return m;
};

// --- AURORA SHADERS ---
const auroraVertexShader = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const auroraFragmentShader = `
uniform float uTime; uniform float uAudio; uniform vec3 uColorA; uniform vec3 uColorB;
varying vec2 vUv;
float random(vec2 st) { return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123); }
float noise(in vec2 st) {
  vec2 i=floor(st); vec2 f=fract(st);
  float a=random(i); float b=random(i+vec2(1.,0.)); float c=random(i+vec2(0.,1.)); float d=random(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
void main() {
  vec2 st=vUv*3.; float mv=uTime*0.2+uAudio*0.5;
  float n=noise(st+vec2(mv,mv*.5)); float n2=noise(st*2.-vec2(mv*.3,0.));
  float horizon=smoothstep(.8,.2,vUv.y);
  vec3 color=mix(uColorA,uColorB,mix(n,n2,.5));
  gl_FragColor=vec4(color*horizon*(0.3+uAudio*0.8),1.);
}
`;

// --- VISUALIZER VERTEX SHADER ---
const visVertexShader = `
uniform sampler2D uVideoTexture;
uniform float uDisplacement;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uTime;
uniform float uTurbulence;
uniform float uSize;
uniform bool uMirror;
uniform int uParticleMode;
uniform float uFxFlash;
uniform float uFxTunnel;
uniform float uFxKaleido;
uniform float uFxPixel;
uniform float uFxRipple;
uniform float uFxRippleAge;
uniform float uFxShake;
uniform float uInBright;
uniform float uInContrast;
uniform float uInSat;
uniform float uInHue;

// Calibración de entrada: se aplica AL MUESTREAR el video, así afecta
// igual a todos los modos (puntos, malla, glitch, matrix).
vec3 hueShift(vec3 color, float a) {
  const vec3 k = vec3(0.57735);   // eje gris normalizado
  float ca = cos(a);
  return color * ca + cross(k, color) * sin(a) + k * dot(k, color) * (1.0 - ca);
}
vec3 adjustInput(vec3 c) {
  c = (c - 0.5) * uInContrast + 0.5 + uInBright;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uInSat);
  if (abs(uInHue) > 0.001) c = hueShift(c, uInHue);
  return clamp(c, 0.0, 1.0);
}
varying vec2 vUv;
varying vec2 vGlitchUv;
varying vec3 vColor;
varying float vBright;
varying float vCharId;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m; m=m*m;
  vec3 x=2.*fract(p*C.www)-1.; vec3 h=abs(x)-.5;
  vec3 ox=floor(x+.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

void main() {
  vUv = uv;
  if (uMirror) vUv.x = 1.0 - vUv.x;

  // --- FX: deformaciones de UV (antes del sampleo → afectan todos los modos) ---
  vec2 fc = vec2(0.5);
  if (uFxTunnel > 0.004) {
    // Punch de zoom + torsión hacia el centro
    vec2 d = vUv - fc;
    float ang = uFxTunnel * 2.2 * length(d);
    d = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * d;
    vUv = fc + d * (1.0 - uFxTunnel * 0.55);
  }
  if (uFxKaleido > 0.004) {
    // Espejo radial de 6 segmentos
    vec2 d = vUv - fc;
    float r = length(d);
    float a = atan(d.y, d.x);
    float seg = 1.0471975512; // PI/3
    float ka = abs(mod(a, 2.0 * seg) - seg);
    vUv = mix(vUv, fc + r * vec2(cos(ka), sin(ka)), uFxKaleido);
  }
  if (uFxPixel > 0.004) {
    float res = mix(240.0, 18.0, uFxPixel);
    vUv = (floor(vUv * res) + 0.5) / res;
  }

  // Glitch UV: horizontal band jitter
  vGlitchUv = vUv;
  if (uParticleMode == 1) {
    float band = floor(vUv.y * 32.0);
    float t = floor(uTime * 14.0);
    float rng = fract(sin(dot(vec2(band, t), vec2(12.9898, 78.233))) * 43758.5453);
    float strength = step(0.86, rng);
    vGlitchUv.x = fract(vUv.x + (rng - 0.5) * 0.18 * strength);
  }

  vec2 sampleUv = (uParticleMode == 1) ? vGlitchUv : vUv;
  vec3 adj = adjustInput(texture2D(uVideoTexture, sampleUv).rgb);
  float brightness = (adj.r + adj.g + adj.b) / 3.0;
  vBright = brightness;
  vColor = adj;

  vec3 pos = position;
  // Displacement only driven by audio — zero audio = zero displacement
  float audioDrive = uAudioBass * 2.0 + uAudioMid * 0.6;
  float disp = brightness * uDisplacement * audioDrive;
  // Noise gated: only computed and applied when turbulence > 0
  float noiseVal = snoise(vUv * 3.0 + uTime * 0.5) * step(0.001, uTurbulence);
  pos.z += disp + (noiseVal * uTurbulence * 10.0 * uAudioMid * 1.5);
  // X noise also fully gated behind turbulence (was the main source of unwanted movement)
  pos.x += noiseVal * uTurbulence * (2.0 + uAudioBass * 3.0);

  // --- FX: onda expansiva desde el centro ---
  if (uFxRipple > 0.004) {
    pos.z += sin(length(position.xy) * 0.35 - uFxRippleAge * 14.0) * 20.0 * uFxRipple;
  }
  // --- FX: sacudida ---
  if (uFxShake > 0.004) {
    float s1 = fract(sin(uTime * 91.7) * 43758.5453) - 0.5;
    float s2 = fract(sin(uTime * 47.3 + 7.0) * 24634.6345) - 0.5;
    pos.xy += vec2(s1, s2) * 9.0 * uFxShake;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  // --- MATRIX: sortea qué glifo le toca a este punto ---
  // Como cada sprite es UN vértice, el varying no se interpola: llega
  // constante a todos sus fragmentos. Por eso funciona el truco.
  vCharId = 0.0;
  if (uParticleMode == 2) {
    float col = floor(vUv.x * 96.0);
    float row = floor(vUv.y * 54.0);
    // Cambio de glifo escalonado por columna → no mutan todos al unísono
    float swap = floor(uTime * 6.0 + col * 1.7);
    vCharId = floor(fract(sin(dot(vec2(col, row) + swap, vec2(12.9898, 78.233))) * 43758.5453) * 64.0);
  }

  if (uParticleMode == 2) {
    // Glifo de tamaño UNIFORME y capado a 40px.
    // Antes: uSize * (1+brillo*3+agudos*1.5) * 3.5 → hasta 385px por sprite.
    // Eso era el atorón: overdraw, no la animación.
    // El FLASH agranda momentáneamente (envolvente corta → sin costo sostenido)
    gl_PointSize = clamp(uSize * 4.0, 8.0, 40.0) * (1.0 + uFxFlash * 1.2);
  } else {
    gl_PointSize = uSize * (1.0 + brightness * 3.0 + uAudioHigh * 1.5) * (1.0 + uFxFlash * 1.2);
  }
}
`;

// --- VISUALIZER FRAGMENT SHADER ---
const visFragmentShader = `
uniform int uColorMode;
uniform int uParticleMode;
uniform float uBrightness;
uniform float uTime;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform sampler2D uVideoTexture;
uniform sampler2D uMatrixAtlas;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vColor;
varying float vBright;
varying vec2 vUv;
varying vec2 vGlitchUv;
varying float vCharId;

uniform float uFxFlash;
uniform float uFxGlitch;
uniform float uFxInvert;
uniform float uInBright;
uniform float uInContrast;
uniform float uInSat;
uniform float uInHue;

vec3 hueShift(vec3 color, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return color * ca + cross(k, color) * sin(a) + k * dot(k, color) * (1.0 - ca);
}
vec3 adjustInput(vec3 c) {
  c = (c - 0.5) * uInContrast + 0.5 + uInBright;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uInSat);
  if (abs(uInHue) > 0.001) c = hueShift(c, uInHue);
  return clamp(c, 0.0, 1.0);
}

vec3 hsl2rgb(vec3 c){
  vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
  return c.z+c.y*(rgb-.5)*(1.-abs(2.*c.z-1.));
}

// FX de color — se aplica en TODAS las salidas (normal, glitch, matrix)
vec3 applyFx(vec3 c) {
  c = mix(c, vec3(1.0) - c, uFxInvert);      // negativo
  c = mix(c, vec3(1.0), uFxFlash * 0.85);    // flash a blanco
  return c;
}

void main() {
  // ---- COLOR MODE ----
  vec3 finalColor = vColor;
  if      (uColorMode == 1) finalColor = hsl2rgb(vec3(0.33, 1.0, vBright));
  else if (uColorMode == 2) finalColor = mix(vec3(0.08,0.,0.), vec3(1.,0.9,0.), vBright);
  else if (uColorMode == 3) finalColor = mix(vec3(0.,0.,0.18), vec3(0.,1.,1.), vBright);
  else if (uColorMode == 4) finalColor = vec3(vBright);
  else if (uColorMode == 5) finalColor = hsl2rgb(vec3(vBright * 0.85 + uTime * 0.03, 0.9, 0.5));
  else if (uColorMode == 6) finalColor = mix(uColorA, uColorB, vBright);

  // ---- GLITCH MODE ----
  if (uParticleMode == 1) {
    float split = 0.004 + uAudioHigh * 0.018;
    float r = texture2D(uVideoTexture, vec2(vGlitchUv.x + split, vGlitchUv.y)).r;
    float g = texture2D(uVideoTexture, vGlitchUv).g;
    float b = texture2D(uVideoTexture, vec2(vGlitchUv.x - split, vGlitchUv.y)).b;
    finalColor = adjustInput(vec3(r, g, b));
    // Digital scanlines
    float scan = step(0.5, fract(gl_FragCoord.y * 0.5));
    finalColor *= 0.75 + 0.25 * scan;
    // Invert flicker on bass hit
    float flicker = step(0.96, fract(sin(floor(uTime * 22.0) * 127.1) * 43758.5));
    finalColor = mix(finalColor, vec3(1.0) - finalColor, flicker * uAudioBass * 0.6);
    // Noise grain
    float grain = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898,78.233))) * 43758.5);
    finalColor += (grain - 0.5) * 0.08;
    gl_FragColor = vec4(clamp(applyFx(finalColor) * uBrightness, 0., 1.), 1.0);
    return;
  }

  // ---- MATRIX MODE ----
  if (uParticleMode == 2) {
    // Ubica la celda del glifo dentro del atlas 8x8 y muestréala
    vec2 cell = vec2(mod(vCharId, 8.0), floor(vCharId / 8.0));
    vec2 auv = (cell + gl_PointCoord) * 0.125;   // 0.125 = 1/8
    float glyph = texture2D(uMatrixAtlas, auv).r;

    // Descarta temprano: fuera del trazo del carácter o zona oscura del video
    if (glyph < 0.08 || vBright < 0.04) discard;

    // Lluvia: banda que baja por cada columna, desfasada aleatoriamente
    float colSeed = fract(sin(floor(vUv.x * 96.0) * 91.7) * 43758.5453);
    float rain = fract(vUv.y + uTime * 0.35 + colSeed);
    float head = smoothstep(0.0, 0.05, rain) * smoothstep(0.28, 0.05, rain);

    float intensity = clamp(vBright * 1.3 + uAudioBass * 0.5, 0.15, 1.4);

    vec3 matColor;
    if      (uColorMode == 0) matColor = vColor * (0.45 + intensity * 0.95); // color real de la webcam
    else if (uColorMode == 1) matColor = vec3(0.0, intensity, intensity * 0.18);
    else if (uColorMode == 2) matColor = vec3(intensity, intensity * 0.4, 0.0);
    else if (uColorMode == 3) matColor = vec3(0.0, intensity, intensity);
    else if (uColorMode == 5) matColor = hsl2rgb(vec3(fract(vUv.y + uTime * 0.1), 0.9, intensity * 0.5));
    else if (uColorMode == 6) matColor = mix(uColorA, uColorB, vBright) * intensity;
    else matColor = vec3(intensity);

    // Cabeza de la lluvia en blanco — el detalle que la hace leer como Matrix
    matColor = mix(matColor, vec3(1.0), head * 0.85);

    gl_FragColor = vec4(applyFx(matColor) * glyph * uBrightness, glyph * clamp(vBright * 2.0 + 0.25, 0., 1.));
    return;
  }

  // --- FX: ráfaga glitch (separación RGB momentánea en cualquier modo) ---
  if (uFxGlitch > 0.01) {
    float sp = 0.006 + 0.03 * uFxGlitch;
    vec3 g = adjustInput(vec3(
      texture2D(uVideoTexture, vec2(vUv.x + sp, vUv.y)).r,
      texture2D(uVideoTexture, vUv).g,
      texture2D(uVideoTexture, vec2(vUv.x - sp, vUv.y)).b
    ));
    finalColor = mix(finalColor, g, uFxGlitch * 0.9);
  }

  gl_FragColor = vec4(clamp(applyFx(finalColor) * uBrightness, 0., 1.), 1.0);
}
`;

// --- INTRO BACKGROUND ---
const InteractiveBackground = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.05 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    let fid;
    const animate = () => { fid = requestAnimationFrame(animate); pts.rotation.y += 0.002; renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(fid); if (mountRef.current) mountRef.current.removeChild(renderer.domElement); renderer.dispose(); };
  }, []);
  return React.createElement("div", { ref: mountRef, className: "absolute top-0 left-0 w-full h-full z-0" });
};

// --- INITIAL SCREEN ---
const InitialScreen = ({ onStart, error, videoDevices, audioDevices, selectedVideoId, selectedAudioId, onVideoSelect, onAudioSelect, permissionsGranted, onPermissionRequest, loopitoIp, onLoopitoIp, onStartLoopito }) => (
  React.createElement(React.Fragment, null,
    React.createElement(InteractiveBackground, null),
    React.createElement("div", { className: "w-full h-screen flex flex-col items-center justify-center z-10 p-4" },
      React.createElement("div", { className: "text-center" },
        React.createElement("h1", { className: "font-mono text-7xl md:text-9xl font-extrabold text-green-400 tracking-widest uppercase animate-pulse-glow", style: { textShadow: '0 0 5px #39FF14, 0 0 15px #39FF14' } }, "Vi5ual D3u5"),
        React.createElement("div", { className: "mt-8 opacity-0 animate-fade-in-late" },
          !permissionsGranted
            ? React.createElement("button", { onClick: onPermissionRequest, className: "px-8 py-4 bg-green-500 text-gray-900 font-bold text-xl rounded-lg hover:bg-green-400 transform hover:scale-105 transition-all shadow-lg" }, "Permitir Cámara y Micrófono")
            : React.createElement(React.Fragment, null,
                React.createElement("div", { className: "mb-6 max-w-md mx-auto space-y-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-green-500 font-mono mb-1 text-left" }, "CÁMARA / VIDEO"),
                    React.createElement("select", { value: selectedVideoId, onChange: e => onVideoSelect(e.target.value), className: "bg-gray-900/60 border border-green-700/50 text-green-300 text-sm rounded-lg block w-full p-2.5 font-mono" },
                      videoDevices.length > 0 ? videoDevices.map((d, i) => React.createElement("option", { key: d.deviceId, value: d.deviceId }, d.label || `Cámara ${i + 1}`)) : React.createElement("option", null, "Buscando...")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-green-500 font-mono mb-1 text-left" }, "MICRÓFONO / AUDIO"),
                    React.createElement("select", { value: selectedAudioId, onChange: e => onAudioSelect(e.target.value), className: "bg-gray-900/60 border border-green-700/50 text-green-300 text-sm rounded-lg block w-full p-2.5 font-mono" },
                      audioDevices.length > 0 ? audioDevices.map((d, i) => React.createElement("option", { key: d.deviceId, value: d.deviceId }, d.label || `Micrófono ${i + 1}`)) : React.createElement("option", null, "Buscando...")
                    )
                  )
                ),
                React.createElement("button", { onClick: onStart, className: "px-8 py-4 bg-green-500 text-gray-900 font-bold text-xl rounded-lg hover:bg-green-400 transform hover:scale-105 transition-all shadow-lg" }, "Iniciar Experiencia")
              ),
          // LOOPITO: cámara + pulso del teléfono, sin pedir permisos a esta compu
          React.createElement("div", { className: "mt-8 max-w-md mx-auto text-left" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("div", { className: "flex-1 h-px bg-green-900/60" }),
              React.createElement("span", { className: "text-xs text-green-700 font-mono" }, "O"),
              React.createElement("div", { className: "flex-1 h-px bg-green-900/60" })
            ),
            React.createElement("label", { className: "block text-xs text-green-500 font-mono mb-1" }, "LOOPITO (TELÉFONO) · IP"),
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("input", { value: loopitoIp, onChange: e => onLoopitoIp(e.target.value), onKeyDown: e => { if (e.key === 'Enter') onStartLoopito(); }, placeholder: "192.168.1.13", inputMode: "decimal", spellCheck: false, className: "flex-1 min-w-0 bg-gray-900/60 border border-green-700/50 text-green-300 text-sm rounded-lg p-2.5 font-mono outline-none focus:border-green-400" }),
              React.createElement("button", { onClick: onStartLoopito, className: "px-4 bg-green-900/70 border border-green-600 text-green-300 font-bold text-sm rounded-lg hover:bg-green-800 font-mono transition-colors" }, "Conectar")
            ),
            React.createElement("p", { className: "mt-1 text-[10px] text-green-800 font-mono" }, "La IP la muestra Loopito en ⚙ → VISUALES. Mismo Wi-Fi.")
          ),
          error && React.createElement("p", { className: "mt-6 text-red-400 max-w-md mx-auto" }, error)
        )
      )
    )
  )
);

// --- UI COMPONENTS ---
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return React.createElement("div", { className: "border border-gray-700/40 rounded-lg overflow-hidden" },
    React.createElement("button", { onClick: () => setOpen(p => !p), className: "w-full flex justify-between items-center px-3 py-2.5 bg-gray-800/70 hover:bg-gray-700/70 transition-colors text-left" },
      React.createElement("span", { className: "text-xs font-bold text-cyan-300 uppercase tracking-widest" }, title),
      React.createElement("span", { className: "text-gray-500 text-xs" }, open ? "▲" : "▼")
    ),
    open && React.createElement("div", { className: "p-3 space-y-3" }, children)
  );
};

const ControlSlider = ({ label, value, onChange, min = 0, max = 100, step = 1, midiCC }) => (
  React.createElement("div", { className: "flex flex-col space-y-1" },
    React.createElement("div", { className: "flex justify-between items-center" },
      React.createElement("label", { className: "text-xs font-medium text-gray-300 flex items-center gap-1.5" },
        label,
        midiCC !== undefined && React.createElement("span", { className: "text-[9px] px-1 py-0.5 rounded bg-cyan-900/70 text-cyan-400 font-mono border border-cyan-700/40" }, `CC${midiCC}`)
      ),
      React.createElement("span", { className: "text-xs text-cyan-400 font-mono" }, typeof value === 'number' ? value.toFixed(1) : value)
    ),
    React.createElement("input", { type: "range", min, max, step, value, onChange, className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" })
  )
);

const PresetButton = ({ label, isActive, onClick }) => (
  React.createElement("button", { onClick, className: `px-2 py-1.5 text-xs rounded-md transition-all font-mono ${isActive ? 'bg-cyan-500 text-gray-900 font-bold shadow-lg shadow-cyan-500/20' : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'}` }, label)
);

const ToggleSwitch = ({ label, value, onChange }) => (
  React.createElement("div", { className: "flex items-center justify-between" },
    React.createElement("span", { className: "text-xs text-gray-300" }, label),
    React.createElement("button", { onClick: () => onChange(!value), className: `relative inline-flex w-10 h-5 rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-gray-600'}` },
      React.createElement("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}` })
    )
  )
);

// Audio VU Meter display
const AudioMeter = ({ bass, mid, high }) => (
  React.createElement("div", { className: "flex gap-1 items-end h-8" },
    ['BASS', 'MID', 'HIGH'].map((label, i) => {
      const val = [bass, mid, high][i];
      const h = Math.round((val || 0) * 28);
      const color = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#06b6d4';
      return React.createElement("div", { key: label, className: "flex flex-col items-center gap-0.5 flex-1" },
        React.createElement("div", { className: "w-full rounded-sm transition-all", style: { height: `${Math.max(2, h)}px`, background: color, boxShadow: h > 10 ? `0 0 6px ${color}` : 'none' } }),
        React.createElement("span", { className: "text-[8px] font-mono", style: { color } }, label)
      );
    })
  )
);

// --- MIDI PANEL ---
const MidiPanel = ({ midiConnected, midiDeviceName, midiMappings, midiLearnParam, onLearn, onClearMapping, onLoadLPD8 }) => {
  const getMappedCC = (paramKey) => {
    const entry = Object.entries(midiMappings).find(([, m]) => m.param === paramKey);
    return entry ? entry[0] : null;
  };
  return React.createElement("div", { className: "space-y-3" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("div", { className: `flex items-center gap-1.5 text-xs font-mono ${midiConnected ? 'text-green-400' : 'text-gray-500'}` },
        React.createElement("span", { className: `w-2 h-2 rounded-full ${midiConnected ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}` }),
        midiConnected ? (midiDeviceName || 'MIDI Conectado') : 'Sin dispositivo MIDI'
      ),
      React.createElement("button", { onClick: onLoadLPD8, className: "text-[10px] px-2 py-1 rounded bg-orange-900/60 hover:bg-orange-800/60 text-orange-300 border border-orange-700/40 font-mono transition-colors" }, "⟳ AKAI LPD8")
    ),
    React.createElement("p", { className: "text-[9px] text-gray-600 font-mono" }, "K1-K8 → CC 70-77 por defecto"),
    React.createElement("div", { className: "space-y-1" },
      MIDI_PARAMS.map(param => {
        const mappedCC = getMappedCC(param.key);
        const isLearning = midiLearnParam === param.key;
        return React.createElement("div", { key: param.key, className: `flex items-center gap-1.5 py-1.5 px-2 rounded ${isLearning ? 'bg-red-900/30 border border-red-500/40' : 'bg-gray-800/40 hover:bg-gray-800/70'}` },
          React.createElement("span", { className: "text-xs text-gray-300 flex-1 truncate" }, param.label),
          React.createElement("span", { className: `text-[10px] w-10 text-center font-mono ${mappedCC ? 'text-cyan-400' : 'text-gray-600'}` }, mappedCC ? `CC${mappedCC}` : '---'),
          React.createElement("button", { onClick: () => onLearn(isLearning ? null : param.key), className: `text-[10px] px-1.5 py-0.5 rounded font-mono ${isLearning ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}` }, isLearning ? 'ESCUCHA' : 'LEARN'),
          mappedCC
            ? React.createElement("button", { onClick: () => onClearMapping(param.key), className: "w-5 h-5 flex items-center justify-center rounded bg-gray-800 hover:bg-red-900/50 text-gray-600 hover:text-red-400 text-xs" }, "✕")
            : React.createElement("div", { className: "w-5" })
        );
      })
    ),
    midiLearnParam && React.createElement("div", { className: "text-xs text-red-300 text-center py-1 bg-red-900/20 rounded border border-red-500/30 animate-pulse font-mono" },
      `Mueve un knob → "${MIDI_PARAMS.find(p => p.key === midiLearnParam)?.label}"`
    )
  );
};

// --- LOOPITO PANEL ---
// `loopito` es el objeto vivo de conectarLoopito (estado/cam/pulso se mutan
// solos); el App se re-renderiza cada frame por el medidor, así que basta leerlo.
const LoopitoPanel = ({ ip, onIp, onConnect, loopito, beatFx, onBeatFx }) => {
  const conectado = !!loopito?.estado.conectado;
  const bpm = loopito?.pulso.bpm || 0;
  const estado = !loopito ? 'Sin conectar'
    : !conectado ? 'Buscando teléfono…'
    : [loopito.cam.apagada ? 'Cámara apagada' : 'Conectado', bpm > 0 ? `${Math.round(bpm)} BPM` : null].filter(Boolean).join(' · ');
  return React.createElement("div", { className: "space-y-3" },
    React.createElement("div", null,
      React.createElement("label", { className: "block text-[10px] text-gray-500 font-mono uppercase mb-1" }, "IP del teléfono"),
      React.createElement("div", { className: "flex gap-1.5" },
        React.createElement("input", { value: ip, onChange: e => onIp(e.target.value), onKeyDown: e => { if (e.key === 'Enter') onConnect(); }, placeholder: "192.168.1.13", inputMode: "decimal", spellCheck: false, className: "flex-1 min-w-0 bg-gray-900 border border-gray-700 text-cyan-100 text-xs rounded p-2 font-mono outline-none hover:border-cyan-600 focus:border-cyan-500 transition-colors" }),
        React.createElement("button", { onClick: onConnect, className: "text-[10px] px-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold font-mono transition-colors" }, loopito ? 'RECONECTAR' : 'CONECTAR')
      )
    ),
    React.createElement("div", { className: `flex items-center gap-1.5 text-xs font-mono ${conectado ? 'text-green-400' : 'text-gray-500'}` },
      React.createElement("span", { className: `w-2 h-2 rounded-full ${conectado ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}` }),
      estado
    ),
    React.createElement("div", null,
      React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block mb-1.5" }, "Golpe (cada tiempo) → FX"),
      React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
        [['off', 'Apagado'], ...FX_LIST.map(f => [f.key, f.label])].map(([val, label]) =>
          React.createElement(PresetButton, { key: val, label, isActive: beatFx === val, onClick: () => onBeatFx(val) })
        )
      )
    ),
    React.createElement("p", { className: "text-[9px] text-gray-600 font-mono leading-relaxed" }, "El audio llega del teléfono (graves/medios/agudos). Sensibilidad Audio en 80 = tal cual.")
  );
};

// --- CONTROLS PANEL ---
const Controls = ({ settings, setSettings, isVisible, videoDevices, audioDevices, selectedVideoId, selectedAudioId, onVideoDeviceSelect, onAudioDeviceSelect, midiMappings, midiLearnParam, onMidiLearn, onClearMidiMapping, onLoadLPD8, midiConnected, midiDeviceName, audioLevels, onReset, outputActive, outputRes, onOutputRes, onOpenOutput, onCloseOutput, onPadDown, onPadUp, padMap, padLearn, padHeld, onPadLearnStart, fxAmount, onFxAmount, source, loopitoIp, onLoopitoIp, onConnectLoopito, onUseWebcam, loopito, sourceError }) => {
  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));
  const getMidiCC = (k) => { const e = Object.entries(midiMappings).find(([, m]) => m.param === k); return e ? parseInt(e[0]) : undefined; };
  // Pestaña de fuente en el panel. La fuente real solo cambia al conectar
  // Loopito o al volver a la webcam.
  const [fuente, setFuente] = useState(source);
  useEffect(() => { setFuente(source); }, [source]);

  return React.createElement("div", {
    style: {
      transform: isVisible ? 'translateX(0)' : 'translateX(110%)',
      transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
      willChange: 'transform',
      pointerEvents: isVisible ? 'auto' : 'none'   // ← no intercepta eventos cuando está oculto
    },
    // Con la salida en el pop-up, el browser principal es puro panel de
    // control → los controles ocupan toda la pantalla en columnas responsivas.
    className: outputActive
      ? "fixed inset-0 bg-gray-950/98 z-40 flex flex-col"
      : "fixed right-0 top-0 h-screen w-80 bg-gray-950/98 border-l border-cyan-500/20 z-40 flex flex-col shadow-2xl shadow-black/60"
  },
    // Header
    React.createElement("div", { className: "flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/60" },
      React.createElement("div", { className: "flex items-center justify-between mb-1" },
        React.createElement("h2", { className: "text-sm font-bold text-cyan-400 font-mono tracking-widest" }, "D3U5 CONTROLS"),
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("button", {
            onClick: onReset,
            title: "Regresar todo a cero [R]",
            className: "text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-red-900/60 text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-700/50 font-mono transition-colors"
          }, "⟲ CERO"),
          React.createElement("span", { className: "text-[10px] text-gray-600 font-mono" }, "[M]")
        )
      ),
      React.createElement(AudioMeter, { bass: audioLevels.bass, mid: audioLevels.mid, high: audioLevels.high })
    ),

    // Content — onWheel stopPropagation prevents the panel scroll from blocking canvas zoom
    React.createElement("div", {
      className: outputActive
        ? "flex-1 overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start items-start"
        : "flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2",
      style: { overscrollBehavior: 'contain' }, onWheel: e => e.stopPropagation()
    },

      // ENTRADA
      React.createElement(Section, { title: "Entrada", defaultOpen: true },
        React.createElement("div", null,
          React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block mb-1.5" }, "Fuente"),
          React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
            React.createElement(PresetButton, { label: "Webcam / Mic", isActive: fuente === 'webcam', onClick: () => { setFuente('webcam'); if (source !== 'webcam') onUseWebcam(); } }),
            React.createElement(PresetButton, { label: "LOOPITO (teléfono)", isActive: fuente === 'loopito', onClick: () => setFuente('loopito') })
          )
        ),
        fuente === 'loopito'
          ? React.createElement(LoopitoPanel, { ip: loopitoIp, onIp: onLoopitoIp, onConnect: onConnectLoopito, loopito: source === 'loopito' ? loopito : null, beatFx: settings.beatFx, onBeatFx: v => set('beatFx', v) })
          : React.createElement(React.Fragment, null,
              React.createElement("div", null,
                React.createElement("label", { className: "block text-[10px] text-gray-500 font-mono uppercase mb-1" }, "Cámara / Video"),
                React.createElement("select", { value: selectedVideoId, onChange: e => onVideoDeviceSelect(e.target.value), className: "w-full bg-gray-900 border border-gray-700 text-cyan-100 text-xs rounded p-2 font-mono outline-none hover:border-cyan-600 transition-colors" },
                  videoDevices?.length > 0 ? videoDevices.map((d, i) => React.createElement("option", { key: d.deviceId, value: d.deviceId }, d.label || `Cámara ${i + 1}`)) : React.createElement("option", null, "Sin cámaras")
                )
              ),
              React.createElement("div", null,
                React.createElement("label", { className: "block text-[10px] text-gray-500 font-mono uppercase mb-1" }, "Micrófono / Audio"),
                React.createElement("select", { value: selectedAudioId, onChange: e => onAudioDeviceSelect(e.target.value), className: "w-full bg-gray-900 border border-gray-700 text-cyan-100 text-xs rounded p-2 font-mono outline-none hover:border-cyan-600 transition-colors" },
                  audioDevices?.length > 0 ? audioDevices.map((d, i) => React.createElement("option", { key: d.deviceId, value: d.deviceId }, d.label || `Micrófono ${i + 1}`)) : React.createElement("option", null, "Sin micrófonos")
                )
              )
            ),
        sourceError && React.createElement("p", { className: "text-[10px] text-red-400 font-mono leading-relaxed" }, sourceError),
        React.createElement(ToggleSwitch, { label: "Espejo Horizontal", value: settings.mirror, onChange: v => set('mirror', v) }),
        React.createElement("div", { className: "pt-1 border-t border-gray-800 space-y-3" },
          React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block" }, "Calibración de color"),
          React.createElement(ControlSlider, { label: "Brillo Entrada", value: settings.inBrightness, min: -0.5, max: 0.5, step: 0.01, onChange: e => set('inBrightness', parseFloat(e.target.value)) }),
          React.createElement(ControlSlider, { label: "Contraste", value: settings.inContrast, min: 0.5, max: 2, step: 0.01, onChange: e => set('inContrast', parseFloat(e.target.value)) }),
          React.createElement(ControlSlider, { label: "Saturación", value: settings.inSaturation, min: 0, max: 2, step: 0.01, onChange: e => set('inSaturation', parseFloat(e.target.value)) }),
          React.createElement(ControlSlider, { label: "Tono (Hue)", value: settings.inHue, min: -180, max: 180, step: 1, onChange: e => set('inHue', parseFloat(e.target.value)) })
        )
      ),

      // SALIDA / OBS
      React.createElement(Section, { title: "Salida / OBS", defaultOpen: true },
        React.createElement("div", null,
          React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block mb-1.5" }, "Resolución de salida"),
          React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
            ['1920x1080', '1280x720', '960x540'].map(r =>
              React.createElement(PresetButton, { key: r, label: r, isActive: outputRes === r, onClick: () => onOutputRes(r) })
            )
          )
        ),
        React.createElement("button", {
          onClick: outputActive ? onCloseOutput : onOpenOutput,
          className: `w-full py-2.5 rounded-md font-mono text-xs font-bold transition-all ${outputActive
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
            : 'bg-cyan-500 hover:bg-cyan-400 text-gray-900 shadow-lg shadow-cyan-500/20'}`
        }, outputActive ? '■ CERRAR SALIDA' : '▶ ABRIR VENTANA DE SALIDA  [O]'),
        outputActive && React.createElement("p", { className: "text-[9px] text-cyan-600 font-mono leading-relaxed" },
          "OBS → Captura de ventana → \"D3U5 OUTPUT\" · Método: Windows 10 (1903+) · Marca \"Área de cliente\""
        ),
        !outputActive && React.createElement("p", { className: "text-[9px] text-gray-600 font-mono leading-relaxed" },
          "Manda la ventana al monitor 2 y déjala visible. Si la tapas, Chrome baja los FPS."
        )
      ),

      // FX PADS
      React.createElement(Section, { title: "FX Pads · LPD8", defaultOpen: true },
        React.createElement("div", { className: "grid grid-cols-4 gap-1.5" },
          FX_LIST.map((f, i) => {
            const note = Object.keys(padMap).find(n => padMap[n] === i);
            const isLearning = padLearn === i;
            const isHeld = padHeld[i];
            return React.createElement("div", { key: f.key, className: "flex flex-col gap-1" },
              React.createElement("button", {
                // Mantener presionado = sostener el efecto
                onMouseDown: () => onPadDown(i),
                onMouseUp: () => onPadUp(i),
                onMouseLeave: () => isHeld && onPadUp(i),
                onTouchStart: (e) => { e.preventDefault(); onPadDown(i); },
                onTouchEnd: (e) => { e.preventDefault(); onPadUp(i); },
                className: `flex flex-col items-center py-2 rounded-md font-mono transition-all border select-none ${
                  isLearning ? 'bg-red-900/50 border-red-500 animate-pulse'
                  : isHeld ? 'bg-cyan-400 border-cyan-300 text-gray-900 scale-95 shadow-lg shadow-cyan-400/40'
                  : 'bg-gray-800/70 border-gray-700/50 hover:bg-gray-700 hover:border-cyan-600/50 text-gray-300'}`
              },
                React.createElement("span", { className: "text-[10px] font-bold" }, f.label),
                React.createElement("span", { className: `text-[8px] ${isHeld ? 'text-gray-800' : 'text-gray-600'}` }, note ? `N${note}` : '---')
              ),
              // Cantidad del efecto (0-100%)
              React.createElement("input", {
                type: "range", min: 0, max: 100, step: 1,
                value: Math.round(fxAmount[i] * 100),
                onChange: e => onFxAmount(i, parseInt(e.target.value) / 100),
                title: `${f.label}: ${Math.round(fxAmount[i] * 100)}%`,
                className: "w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              })
            );
          })
        ),
        React.createElement("div", { className: "flex items-center justify-between" },
          React.createElement("p", { className: "text-[9px] text-gray-600 font-mono" }, "Teclado: 1-8 · mantener = sostener"),
          React.createElement("button", {
            onClick: onPadLearnStart,
            className: `text-[10px] px-2 py-1 rounded font-mono border transition-colors ${padLearn >= 0
              ? 'bg-red-900/60 text-red-300 border-red-700/50'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700'}`
          }, padLearn >= 0 ? `Golpea pad ${padLearn + 1}/8…` : '⟳ LEARN PADS')
        )
      ),

      // MODO VISUAL
      React.createElement(Section, { title: "Modo Visual", defaultOpen: true },
        React.createElement("div", null,
          React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block mb-1.5" }, "Tipo de Partículas"),
          React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
            [['points','Puntos'],['lines','Malla'],['mesh','Sólido'],['glitch','Glitch'],['matrix','Matrix']].map(([val, label]) =>
              React.createElement(PresetButton, { key: val, label, isActive: settings.particleType === val, onClick: () => set('particleType', val) })
            )
          )
        ),
        React.createElement("div", null,
          React.createElement("span", { className: "text-[10px] text-gray-500 font-mono uppercase block mb-1.5" }, "Paleta de Color"),
          React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
            [['webcam','Webcam'],['neon','Matrix'],['lava','Lava'],['ocean','Cyber'],['analog','B&W'],['rainbow','Rainbow'],['custom','Custom']].map(([val, label]) =>
              React.createElement(PresetButton, { key: val, label, isActive: settings.colorMode === val, onClick: () => set('colorMode', val) })
            )
          )
        ),
        settings.colorMode === 'custom' && React.createElement("div", { className: "flex items-center gap-3 bg-gray-800/50 p-2 rounded" },
          React.createElement("span", { className: "text-xs text-gray-300 flex-1" }, "Color A → B"),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement("input", { type: "color", value: settings.customColorA, onChange: e => set('customColorA', e.target.value), className: "w-8 h-8 rounded cursor-pointer border-0 bg-transparent", title: "Color oscuro (sombras)" }),
            React.createElement("span", { className: "text-gray-600 text-xs" }, "→"),
            React.createElement("input", { type: "color", value: settings.customColorB, onChange: e => set('customColorB', e.target.value), className: "w-8 h-8 rounded cursor-pointer border-0 bg-transparent", title: "Color brillante (luces)" })
          )
        )
      ),

      // PARÁMETROS AUDIO + VISUAL
      React.createElement(Section, { title: "Parámetros", defaultOpen: true },
        React.createElement(ControlSlider, { label: "Desplazamiento 3D", value: settings.displacement, min: 0, max: 200, onChange: e => set('displacement', parseFloat(e.target.value)), midiCC: getMidiCC('displacement') }),
        React.createElement(ControlSlider, { label: "Sensibilidad Audio", value: settings.audioSensitivity, min: 0, max: 200, onChange: e => set('audioSensitivity', parseFloat(e.target.value)), midiCC: getMidiCC('audioSensitivity') }),
        React.createElement(ControlSlider, { label: "Turbulencia / Ruido", value: settings.turbulence, min: 0, max: 5, step: 0.1, onChange: e => set('turbulence', parseFloat(e.target.value)), midiCC: getMidiCC('turbulence') }),
        React.createElement(ControlSlider, { label: "Tamaño Partículas", value: settings.particleSize, min: 0.5, max: 20, step: 0.5, onChange: e => set('particleSize', parseFloat(e.target.value)), midiCC: getMidiCC('particleSize') }),
        React.createElement(ControlSlider, { label: "Brillo", value: settings.brightness, min: 0, max: 2.5, step: 0.05, onChange: e => set('brightness', parseFloat(e.target.value)), midiCC: getMidiCC('brightness') })
      ),

      // FONDO
      React.createElement(Section, { title: "Fondo / Ambiente" },
        React.createElement("div", { className: "grid grid-cols-2 gap-2" },
          [['black','Negro'],['stars','Estrellas'],['grid','Cyber Grid'],['aurora','Aurora']].map(([val, label]) =>
            React.createElement(PresetButton, { key: val, label, isActive: settings.bgMode === val, onClick: () => set('bgMode', val) })
          )
        ),
        settings.bgMode !== 'black' && React.createElement("div", { className: "flex items-center justify-between bg-gray-800/50 p-2 rounded" },
          React.createElement("label", { className: "text-xs text-gray-300" }, "Color de Fondo"),
          React.createElement("input", { type: "color", value: settings.bgColor, onChange: e => set('bgColor', e.target.value), className: "w-8 h-8 cursor-pointer border-0 bg-transparent rounded" })
        )
      ),

      // CÁMARA 3D
      React.createElement(Section, { title: "Cámara 3D" },
        React.createElement("div", { className: "grid grid-cols-3 gap-2" },
          [['default','Frontal'],['orbiting','Órbita'],['top-down','Aérea']].map(([val, label]) =>
            React.createElement(PresetButton, { key: val, label, isActive: settings.cameraPreset === val, onClick: () => set('cameraPreset', val) })
          )
        ),
        React.createElement(ControlSlider, { label: "Velocidad Órbita", value: settings.orbitSpeed, min: 0, max: 1.5, step: 0.01, onChange: e => set('orbitSpeed', parseFloat(e.target.value)), midiCC: getMidiCC('orbitSpeed') }),
        React.createElement(ControlSlider, { label: "Zoom / Distancia", value: settings.zoom, min: 30, max: 350, onChange: e => set('zoom', parseFloat(e.target.value)), midiCC: getMidiCC('zoom') }),
        React.createElement(ControlSlider, { label: "Campo de Visión (FOV)", value: settings.cameraFov, min: 30, max: 130, onChange: e => set('cameraFov', parseFloat(e.target.value)), midiCC: getMidiCC('cameraFov') })
      ),

      // MIDI
      React.createElement(Section, { title: "MIDI / AKAI LPD8" },
        React.createElement(MidiPanel, { midiConnected, midiDeviceName, midiMappings, midiLearnParam, onLearn: onMidiLearn, onClearMapping: onClearMidiMapping, onLoadLPD8 })
      )
    ),

    React.createElement("div", { className: "flex-shrink-0 px-4 py-2 border-t border-gray-800" },
      React.createElement("p", { className: "text-[10px] text-gray-600 font-mono text-center" }, "D3U5 v9.2 · [M] menú · [O] salida · [1-8] FX · [R] cero")
    )
  );
};

// --- VISUALIZER ---
const Visualizer = ({ settings, stream, pulso, onAudioLevels, outputWindow, fxTriggerRef, fxAmountRef }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  // --- Driver del render loop ---
  // rafHostRef = qué ventana dispara los frames. Cuando el canvas vive en el
  // pop-up, DEBE ser el pop-up: si dejamos el rAF en la ventana principal,
  // Chrome lo estrangula a ~1fps en cuanto la tapas u ocluyes.
  const rafHostRef = useRef(null);
  const rafHostUsedRef = useRef(null);
  const frameIdRef = useRef(null);
  const animateRef = useRef(null);
  const resizeRef = useRef(null);
  const canvasHostRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const materialRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const backgroundGroupRef = useRef(null);
  const auroraMatRef = useRef(null);
  const audioCtxRef = useRef(null);
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // FOV update
  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.fov = settings.cameraFov;
    cam.updateProjectionMatrix();
  }, [settings.cameraFov]);

  // Zoom slider — writes to ref; animation loop applies it so it never fights OrbitControls
  const sliderZoomRef = useRef(null);
  useEffect(() => { sliderZoomRef.current = settings.zoom; }, [settings.zoom]);

  // Main setup
  useEffect(() => {
    if (!mountRef.current || !stream) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0012); // Softer fog → less clipping on zoom
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(settings.cameraFov, window.innerWidth / window.innerHeight, 0.5, 3000);
    camera.position.set(0, 0, settings.zoom);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Tope de 1.5: en pantalla HiDPI (dPR 2) el costo de GPU se cuadruplica
    // sin ganancia visible una vez que OBS reescala a 1080p.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    canvasHostRef.current = window;
    rafHostRef.current = window;

    // Si el contexto WebGL se pierde al mover el canvas entre documentos,
    // preventDefault permite que el browser lo restaure en vez de morir seco.
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[D3U5] Contexto WebGL perdido — intentando restaurar');
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 10;   // Prevents zoom-through
    controls.maxDistance = 600;
    controlsRef.current = controls;

    // Video texture
    const video = document.createElement('video');
    video.srcObject = stream; video.playsInline = true; video.muted = true; video.play();
    const videoTexture = new THREE.VideoTexture(video);

    // Audio pipeline — solo con webcam/mic. Con Loopito los niveles llegan ya
    // calculados en `pulso` y su stream no trae pista de audio
    // (createMediaStreamSource truena), así que no se arma nada.
    const audioCtx = pulso ? null : new AudioContext();
    audioCtxRef.current = audioCtx;
    let analyser = null, tdArray = null;
    if (audioCtx) {
      // Resume immediately — browsers suspend AudioContext until user interaction
      audioCtx.resume();
      // Re-resume on any click in case browser blocked it
      const resumeAudio = () => { if (audioCtx.state === 'suspended') audioCtx.resume(); };
      renderer.domElement.addEventListener('click', resumeAudio, { once: false });

      const source = audioCtx.createMediaStreamSource(stream);

      // GainNode: amplify mic signal (mics are often very quiet)
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 5.0;

      // Compressor: bring up quiet sounds, prevent clipping on loud ones
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -40;
      compressor.knee.value = 30;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;               // 1024 bins → better low-freq resolution (~21 Hz/bin at 44.1kHz)
      analyser.smoothingTimeConstant = 0.75; // Smooth but still reactive

      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      // Time-domain array for RMS (more accurate overall volume)
      tdArray = new Uint8Array(analyser.fftSize);
    }

    // Geometry + shader material
    const geometry = new THREE.PlaneGeometry(160, 90, 180, 120);
    const col = new THREE.Color(settings.customColorA || '#ff0066');
    const colB = new THREE.Color(settings.customColorB || '#00ffcc');
    const material = new THREE.ShaderMaterial({
      vertexShader: visVertexShader,
      fragmentShader: visFragmentShader,
      uniforms: {
        uVideoTexture:  { value: videoTexture },
        uMatrixAtlas:   { value: makeMatrixAtlas() },
        uDisplacement:  { value: 30.0 },
        uAudioBass:     { value: 0.0 },
        uAudioMid:      { value: 0.0 },
        uAudioHigh:     { value: 0.0 },
        uTime:          { value: 0.0 },
        uTurbulence:    { value: 0.0 },
        uSize:          { value: 2.0 },
        uColorMode:     { value: 0 },
        uParticleMode:  { value: 0 },
        uMirror:        { value: true },
        uBrightness:    { value: 1.0 },
        uColorA:        { value: new THREE.Color(col) },
        uColorB:        { value: new THREE.Color(colB) },
        // FX pads (envolventes momentáneas)
        uFxFlash:       { value: 0.0 },
        uFxGlitch:      { value: 0.0 },
        uFxTunnel:      { value: 0.0 },
        uFxKaleido:     { value: 0.0 },
        uFxRipple:      { value: 0.0 },
        uFxRippleAge:   { value: 99.0 },
        uFxShake:       { value: 0.0 },
        uFxInvert:      { value: 0.0 },
        uFxPixel:       { value: 0.0 },
        // Calibración de entrada
        uInBright:      { value: 0.0 },
        uInContrast:    { value: 1.0 },
        uInSat:         { value: 1.0 },
        uInHue:         { value: 0.0 },
      },
      transparent: true,
      side: THREE.DoubleSide
    });
    materialRef.current = material;

    const mesh = new THREE.Points(geometry, material);
    mesh.name = 'visMesh';
    scene.add(mesh);

    const bgGroup = new THREE.Group();
    scene.add(bgGroup);
    backgroundGroupRef.current = bgGroup;

    const clock = new THREE.Clock();

    // --- Motor de FX pads ---
    // Los valores viven FUERA de React: se disparan y decaen a 60fps sin
    // provocar ni un re-render. Tocar los pads es gratis para la UI.
    // gate=true (pad presionado) → la envolvente se sostiene en 1.0;
    // al soltar, decae con su cola. La ONDA sigue ondulando sostenida
    // porque su fase (rippleAge) avanza con el reloj.
    const fx = { flash: 0, glitch: 0, tunnel: 0, kaleido: 0, ripple: 0, shake: 0, invert: 0, pixel: 0, rippleT: -99 };
    const gates = {};
    if (fxTriggerRef) fxTriggerRef.current = (i, down) => {
      const key = FX_LIST[i]?.key;
      if (!key) return;
      if (down) {
        gates[key] = true;
        fx[key] = 1.0;
        if (key === 'ripple') fx.rippleT = clock.getElapsedTime();
      } else {
        gates[key] = false;
      }
    };
    let prevElapsed = 0;
    let lastGolpe = pulso ? pulso.golpe : 0;

    const animate = () => {
      // El frame lo pide la ventana donde vive el canvas. Al mover el canvas
      // al pop-up, rafHostRef cambia y el loop se muda solo en un frame.
      const host = rafHostRef.current || window;
      rafHostUsedRef.current = host;
      frameIdRef.current = host.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const s = settingsRef.current;

      // --- Decaimiento de FX (independiente del framerate) ---
      const dt = Math.min(0.1, elapsed - prevElapsed);
      prevElapsed = elapsed;
      for (const f of FX_LIST) {
        if (gates[f.key]) fx[f.key] = 1.0;
        else if (fx[f.key] > 0.002) fx[f.key] *= Math.exp(-dt / f.tau);
        else fx[f.key] = 0;
      }

      // --- Audio analysis ---
      const sens = s.audioSensitivity / 80.0;
      let bass, mid, high;
      if (pulso) {
        // Loopito: envolventes 0..1 ya limpias (no hay ruido de micrófono →
        // sin noise gate). Sensibilidad 80 = tal cual llegan del teléfono.
        bass = Math.min(1.0, pulso.graves * sens);
        mid  = Math.min(1.0, pulso.medios * sens);
        high = Math.min(1.0, pulso.agudos * sens);

        // Cada tiempo del BPM (golpe cambia) dispara el FX elegido como un
        // toque de pad: sube a 1 y decae con su cola normal.
        if (pulso.golpe !== lastGolpe) {
          lastGolpe = pulso.golpe;
          if (FX_LIST.some(f => f.key === s.beatFx)) {
            fx[s.beatFx] = 1.0;
            if (s.beatFx === 'ripple') fx.rippleT = elapsed;
          }
        }
      } else {
        analyser.getByteFrequencyData(dataArrayRef.current);
        analyser.getByteTimeDomainData(tdArray);
        const data = dataArrayRef.current;
        const sr = audioCtx.sampleRate;
        const binWidth = sr / analyser.fftSize;

        // Frequency band averages
        const getBand = (lo, hi) => {
          const lb = Math.max(0, Math.floor(lo / binWidth));
          const hb = Math.min(data.length - 1, Math.ceil(hi / binWidth));
          let sum = 0;
          for (let i = lb; i <= hb; i++) sum += data[i];
          return sum / ((hb - lb + 1) * 255);
        };

        // RMS from time-domain — catches overall volume regardless of freq content
        let rmsSum = 0;
        for (let i = 0; i < tdArray.length; i++) {
          const v = (tdArray[i] / 128.0) - 1.0;
          rmsSum += v * v;
        }
        const rms = Math.sqrt(rmsSum / tdArray.length);

        const rawBass = Math.max(getBand(20, 300), rms * 0.7);
        const rawMid  = Math.max(getBand(250, 2500), rms * 0.4);
        const rawHigh = getBand(2000, 10000);

        // Noise gate: señales menores al umbral se recortan a 0
        // Evita que el ruido ambiental del micrófono genere movimiento en silencio
        const GATE = 0.035;
        const gate = v => v < GATE ? 0 : (v - GATE) / (1 - GATE);

        bass = Math.min(1.0, gate(rawBass) * sens * 3.2);
        mid  = Math.min(1.0, gate(rawMid)  * sens * 2.0);
        high = Math.min(1.0, gate(rawHigh) * sens * 1.5);
      }

      if (onAudioLevels) onAudioLevels({ bass, mid, high });

      // --- Update uniforms ---
      if (materialRef.current) {
        const u = materialRef.current.uniforms;
        u.uTime.value        = elapsed;
        u.uAudioBass.value   = bass;
        u.uAudioMid.value    = mid;
        u.uAudioHigh.value   = high;
        u.uDisplacement.value = s.displacement;
        u.uTurbulence.value  = s.turbulence;
        u.uSize.value        = s.particleSize;
        u.uMirror.value      = s.mirror;
        u.uBrightness.value  = s.brightness;
        // Color mode index
        const colorIdx = { webcam:0, neon:1, lava:2, ocean:3, analog:4, rainbow:5, custom:6 };
        u.uColorMode.value = colorIdx[s.colorMode] ?? 0;
        // Particle mode index
        const partIdx = { glitch:1, matrix:2 };
        u.uParticleMode.value = partIdx[s.particleType] ?? 0;
        // Custom colors
        if (s.customColorA) u.uColorA.value.set(s.customColorA);
        if (s.customColorB) u.uColorB.value.set(s.customColorB);
        // FX pads — envolvente × cantidad del slider
        const amt = fxAmountRef?.current || [];
        const A = (i) => (amt[i] !== undefined ? amt[i] : 1);
        u.uFxFlash.value     = fx.flash   * A(0);
        u.uFxGlitch.value    = fx.glitch  * A(1);
        u.uFxTunnel.value    = fx.tunnel  * A(2);
        u.uFxKaleido.value   = fx.kaleido * A(3);
        u.uFxRipple.value    = fx.ripple  * A(4);
        u.uFxRippleAge.value = elapsed - fx.rippleT;
        u.uFxShake.value     = fx.shake   * A(5);
        u.uFxInvert.value    = fx.invert  * A(6);
        u.uFxPixel.value     = fx.pixel   * A(7);
        // Calibración de entrada
        u.uInBright.value    = s.inBrightness;
        u.uInContrast.value  = s.inContrast;
        u.uInSat.value       = s.inSaturation;
        u.uInHue.value       = s.inHue * 0.0174533; // grados → radianes
      }

      if (auroraMatRef.current) {
        const au = auroraMatRef.current.uniforms;
        au.uTime.value  = elapsed;
        au.uAudio.value = bass; // Aurora reacts to bass
        const c = new THREE.Color(s.bgColor);
        au.uColorA.value.set(c.r, c.g, c.b);
        au.uColorB.value.set(c.b, c.r, c.g);
      }

      bgGroup.children.forEach(child => {
        if (child.name === 'stars') child.rotation.y += 0.0003;
        if (child.name.includes('grid')) child.position.z = (elapsed * 10) % 50;
      });

      if (s.cameraPreset === 'orbiting') {
        const r = s.zoom || 120;
        camera.position.x = Math.sin(elapsed * s.orbitSpeed) * r;
        camera.position.z = Math.cos(elapsed * s.orbitSpeed) * r;
        camera.lookAt(0, 0, 0);
      } else if (sliderZoomRef.current !== null) {
        // Apply zoom slider change without calling ctrl.update() on every frame
        const target = sliderZoomRef.current;
        sliderZoomRef.current = null;
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 1);
        camera.position.copy(controls.target).addScaledVector(dir, target);
        controls.update();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animateRef.current = animate;
    animate();

    // El tamaño se lee de la ventana que hospeda el canvas, no de window.
    const handleResize = () => {
      const host = canvasHostRef.current || window;
      const w = host.innerWidth, h = host.innerHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resizeRef.current = handleResize;
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      const h = rafHostUsedRef.current || window;
      if (frameIdRef.current != null) { try { h.cancelAnimationFrame(frameIdRef.current); } catch (e) {} }
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer.dispose();
      if (audioCtx) audioCtx.close();
    };
  }, [stream, pulso]);

  // --- SALIDA A POP-UP ---
  // Mueve el canvas WebGL al pop-up y traslada el render loop con él.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const canvas = renderer.domElement;
    const target = outputWindow || window;

    if (outputWindow) {
      outputWindow.document.body.appendChild(canvas);
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    } else if (mountRef.current) {
      mountRef.current.appendChild(canvas);
    }

    canvasHostRef.current = target;
    rafHostRef.current = target;

    // Re-arranca el loop en la ventana nueva: si el pop-up se cerró, sus
    // frames ya no llegan nunca y el loop quedaría muerto.
    const prev = rafHostUsedRef.current;
    if (prev && frameIdRef.current != null) { try { prev.cancelAnimationFrame(frameIdRef.current); } catch (e) {} }
    if (animateRef.current) {
      rafHostUsedRef.current = target;
      frameIdRef.current = target.requestAnimationFrame(animateRef.current);
    }

    if (resizeRef.current) {
      target.addEventListener('resize', resizeRef.current);
      // Doble tick: el pop-up reporta innerWidth real hasta después del layout
      resizeRef.current();
      setTimeout(resizeRef.current, 120);
    }
    return () => { if (resizeRef.current) target.removeEventListener('resize', resizeRef.current); };
  }, [outputWindow]);

  // Camera preset changes
  useEffect(() => {
    const cam = cameraRef.current; const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    ctrl.target.set(0, 0, 0);
    if (settings.cameraPreset === 'default')   { ctrl.enabled = true; cam.position.set(0, 0, settings.zoom); cam.lookAt(0,0,0); }
    if (settings.cameraPreset === 'top-down')  { ctrl.enabled = true; cam.position.set(0, 150, 10); cam.lookAt(0,0,0); }
    if (settings.cameraPreset === 'orbiting')  { ctrl.enabled = false; }
    ctrl.update();
  }, [settings.cameraPreset]);

  // Particle type — geometry switch
  useEffect(() => {
    const scene = sceneRef.current; const mat = materialRef.current;
    if (!scene || !mat) return;
    const old = scene.getObjectByName('visMesh');
    if (old) { old.geometry.dispose(); scene.remove(old); }
    const pt = settings.particleType;
    // Matrix usa malla gruesa (97x55 = 5,335 glifos). Densidad real de la
    // película: ~96 columnas. Con 180x120 los caracteres quedaban del tamaño
    // de un píxel — ilegibles y 4x más caros.
    const geo = (pt === 'matrix')
      ? new THREE.PlaneGeometry(160, 90, 96, 54)
      : new THREE.PlaneGeometry(160, 90, 180, 120);
    let mesh;
    if (pt === 'lines') { mesh = new THREE.Mesh(geo, mat); mat.wireframe = true; }
    else if (pt === 'mesh') { mesh = new THREE.Mesh(geo, mat); mat.wireframe = false; }
    else { mesh = new THREE.Points(geo, mat); mat.wireframe = false; } // points, glitch, matrix
    mesh.name = 'visMesh';
    scene.add(mesh);
  }, [settings.particleType]);

  // Background mode
  useEffect(() => {
    const grp = backgroundGroupRef.current; const scene = sceneRef.current;
    if (!grp || !scene) return;
    while (grp.children.length > 0) {
      const o = grp.children[0];
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
      grp.remove(o);
    }
    auroraMatRef.current = null;

    if (settings.bgMode === 'black') {
      scene.background = new THREE.Color(0x000000);
    } else if (settings.bgMode === 'stars') {
      scene.background = new THREE.Color(0x020205);
      const geo = new THREE.BufferGeometry();
      const pos = [];
      for (let i = 0; i < 3000; i++) pos.push((Math.random()-.5)*800, (Math.random()-.5)*800, (Math.random()-.5)*800);
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: settings.bgColor, size: 1.5 }));
      stars.name = 'stars'; grp.add(stars);
    } else if (settings.bgMode === 'grid') {
      scene.background = new THREE.Color(0x050010);
      const g1 = new THREE.GridHelper(500, 50, settings.bgColor, 0x111122); g1.position.y = -60; g1.name = 'gridBot'; grp.add(g1);
      const g2 = new THREE.GridHelper(500, 50, settings.bgColor, 0x111122); g2.position.y = 60; g2.name = 'gridTop'; grp.add(g2);
    } else if (settings.bgMode === 'aurora') {
      scene.background = new THREE.Color(0x000000);
      const mat = new THREE.ShaderMaterial({
        vertexShader: auroraVertexShader, fragmentShader: auroraFragmentShader,
        uniforms: { uTime: { value: 0 }, uAudio: { value: 0 }, uColorA: { value: new THREE.Color(settings.bgColor) }, uColorB: { value: new THREE.Color(0x5500ff) } },
        side: THREE.DoubleSide, depthWrite: false
      });
      auroraMatRef.current = mat;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(500, 300), mat);
      mesh.position.z = -150; grp.add(mesh);
    }
  }, [settings.bgMode, settings.bgColor]);

  return React.createElement("div", { ref: mountRef, className: "absolute top-0 left-0 w-full h-full", style: { touchAction: 'none' } });
};

// --- APP ---
const App = () => {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  const [isStarted, setIsStarted] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [audioLevels, setAudioLevels] = useState({ bass: 0, mid: 0, high: 0 });

  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // --- FUENTE: 'webcam' (cámara + mic de esta compu) o 'loopito' (teléfono) ---
  const [source, setSource] = useState('webcam');
  const [loopitoIp, setLoopitoIp] = useState(() => { try { return localStorage.getItem('loopitoIp') || ''; } catch (_) { return ''; } });
  const [lpPulso, setLpPulso] = useState(null);   // lp.pulso → el Visualizer lo lee en vez del micrófono
  const [sourceError, setSourceError] = useState(null);
  const lpRef = useRef(null);
  useEffect(() => () => lpRef.current?.cerrar(), []);

  // MIDI
  const [midiMappings, setMidiMappings] = useState({});
  const [midiLearnParam, setMidiLearnParam] = useState(null);
  const [midiConnected, setMidiConnected] = useState(false);
  const [midiDeviceName, setMidiDeviceName] = useState('');
  const midiMappingsRef = useRef({});
  const midiLearnParamRef = useRef(null);
  useEffect(() => { midiMappingsRef.current = midiMappings; }, [midiMappings]);
  useEffect(() => { midiLearnParamRef.current = midiLearnParam; }, [midiLearnParam]);

  const openOutputRef = useRef(null);

  // --- FX PADS ---
  const fxTriggerRef = useRef(null);          // lo llena el Visualizer: (i, down)
  const [padMap, setPadMap] = useState({ ...DEFAULT_PAD_MAP });
  const padMapRef = useRef(padMap);
  useEffect(() => { padMapRef.current = padMap; }, [padMap]);
  const [padLearn, setPadLearn] = useState(-1);   // -1 = inactivo; 0-7 = esperando ese pad
  const padLearnRef = useRef(-1);
  useEffect(() => { padLearnRef.current = padLearn; }, [padLearn]);
  const [padHeld, setPadHeld] = useState(() => FX_LIST.map(() => false));

  // Cantidad por FX (0-1) — React para la UI, ref para el render loop
  const [fxAmount, setFxAmount] = useState(() => FX_LIST.map(() => 1.0));
  const fxAmountRef = useRef(fxAmount);
  useEffect(() => { fxAmountRef.current = fxAmount; }, [fxAmount]);

  const padDown = (i) => {
    fxTriggerRef.current?.(i, true);
    setPadHeld(p => { if (p[i]) return p; const n = [...p]; n[i] = true; return n; });
  };
  const padUp = (i) => {
    fxTriggerRef.current?.(i, false);
    setPadHeld(p => { if (!p[i]) return p; const n = [...p]; n[i] = false; return n; });
  };
  const padDownRef = useRef(padDown);
  const padUpRef = useRef(padUp);
  useEffect(() => { padDownRef.current = padDown; padUpRef.current = padUp; });

  // Keyboard shortcuts
  useEffect(() => {
    const hk = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key.toLowerCase() === 'm') setIsControlsVisible(p => !p);
      if (e.key.toLowerCase() === 'r') setSettings({ ...DEFAULT_SETTINGS });
      if (e.key.toLowerCase() === 'o') openOutputRef.current?.();
      if (e.key >= '1' && e.key <= '8') padDownRef.current?.(parseInt(e.key) - 1);
      if (e.key === 'Escape') {
        if (midiLearnParamRef.current) setMidiLearnParam(null);
        if (padLearnRef.current >= 0) setPadLearn(-1);
      }
    };
    const hku = (e) => {
      if (e.key >= '1' && e.key <= '8') padUpRef.current?.(parseInt(e.key) - 1);
    };
    window.addEventListener('keydown', hk);
    window.addEventListener('keyup', hku);
    return () => { window.removeEventListener('keydown', hk); window.removeEventListener('keyup', hku); };
  }, []);

  // Device enumeration — re-escanea cuando conectas/desconectas hardware.
  // Sin esto, si prendes la OBS Virtual Camera después de cargar la página
  // no aparece en la lista hasta refrescar.
  useEffect(() => {
    if (!permissionsGranted) return;
    const scan = () => navigator.mediaDevices.enumerateDevices().then(devs => {
      const v = devs.filter(d => d.kind === 'videoinput');
      const a = devs.filter(d => d.kind === 'audioinput');
      setVideoDevices(v);
      setAudioDevices(a);
      setSelectedVideoId(prev => (prev && v.some(d => d.deviceId === prev)) ? prev : (v[0]?.deviceId || ''));
      setSelectedAudioId(prev => (prev && a.some(d => d.deviceId === prev)) ? prev : (a[0]?.deviceId || ''));
    });
    scan();
    navigator.mediaDevices.addEventListener('devicechange', scan);
    return () => navigator.mediaDevices.removeEventListener('devicechange', scan);
  }, [permissionsGranted]);

  // MIDI setup
  useEffect(() => {
    if (!isStarted || !navigator.requestMIDIAccess) return;
    const handleMsg = (event) => {
      const status = event.data[0] & 0xF0;
      const note = event.data[1];

      // --- PADS: Note Off (0x80, o Note On con velocity 0) → soltar ---
      if (status === 0x80 || (status === 0x90 && event.data[2] === 0)) {
        const fxIdx = padMapRef.current[note];
        if (fxIdx !== undefined) padUpRef.current?.(fxIdx);
        return;
      }

      // --- PADS: Note On con velocity > 0 → presionar/sostener ---
      if (status === 0x90) {
        const learnIdx = padLearnRef.current;
        if (learnIdx >= 0) {
          // Learn secuencial: cada golpe asigna el pad que sigue
          const nm = { ...padMapRef.current };
          Object.keys(nm).forEach(k => { if (nm[k] === learnIdx) delete nm[k]; });
          nm[note] = learnIdx;
          padMapRef.current = nm;
          setPadMap(nm);
          setPadLearn(learnIdx + 1 < 8 ? learnIdx + 1 : -1);
          return;
        }
        const fxIdx = padMapRef.current[note];
        if (fxIdx !== undefined) padDownRef.current?.(fxIdx);
        return;
      }

      if (status !== 0xB0) return;
      const cc = event.data[1], value = event.data[2];
      const learning = midiLearnParamRef.current;
      if (learning) {
        const def = MIDI_PARAMS.find(p => p.key === learning);
        if (def) {
          const nm = { ...midiMappingsRef.current };
          Object.keys(nm).forEach(k => { if (nm[k].param === learning) delete nm[k]; });
          nm[cc] = { param: def.key, min: def.min, max: def.max };
          midiMappingsRef.current = nm;
          setMidiMappings({ ...nm });
          setMidiLearnParam(null);
        }
      } else {
        const m = midiMappingsRef.current[cc];
        if (m) setSettings(p => ({ ...p, [m.param]: m.min + (value / 127) * (m.max - m.min) }));
      }
    };
    navigator.requestMIDIAccess().then(access => {
      const names = [];
      access.inputs.forEach(inp => { names.push(inp.name); inp.onmidimessage = handleMsg; });
      setMidiConnected(access.inputs.size > 0);
      setMidiDeviceName(names.join(', '));
      access.onstatechange = e => {
        if (e.port.type === 'input' && e.port.state === 'connected') {
          e.port.onmidimessage = handleMsg;
          setMidiConnected(true);
        }
      };
    }).catch(() => setMidiConnected(false));
  }, [isStarted]);

  const handlePermissionRequest = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      s.getTracks().forEach(t => t.stop());
      setPermissionsGranted(true);
    } catch (e) { setMediaError("Permisos denegados. Permite cámara y micrófono."); }
  };

  const handleStart = async () => {
    try {
      const vc = selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true;
      const ac = selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true;
      const s = await navigator.mediaDevices.getUserMedia({ video: vc, audio: ac });
      setMediaStream(s); setIsStarted(true);
    } catch (e) { setMediaError(`Error: ${e.message}`); }
  };

  const changeVideoDev = async (id) => {
    setSelectedVideoId(id);
    if (!isStarted) return;
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    const ac = selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true;
    const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: id } }, audio: ac });
    setMediaStream(s);
  };

  const changeAudioDev = async (id) => {
    setSelectedAudioId(id);
    if (!isStarted) return;
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    const vc = selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true;
    const s = await navigator.mediaDevices.getUserMedia({ video: vc, audio: { deviceId: { exact: id } } });
    setMediaStream(s);
  };

  // LOOPITO: lp.stream (solo video, ya girado) toma el lugar de la webcam y
  // lp.pulso el del micrófono. Se reconecta solo si el teléfono se cae.
  const connectLoopito = () => {
    const ip = loopitoIp.trim();
    const fail = (msg) => { setMediaError(msg); setSourceError(msg); };
    if (!ip) return fail('Escribe la IP del teléfono (Loopito → ⚙ → VISUALES).');
    if (location.protocol === 'https:') return fail(LOOPITO_HTTPS_MSG);
    let lp;
    try { lp = conectarLoopito(loopitoUrl(ip)); }
    catch (e) { return fail(`IP inválida: ${e.message}`); }
    try { localStorage.setItem('loopitoIp', ip); } catch (_) {}
    if (lpRef.current) lpRef.current.cerrar();
    else if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    lpRef.current = lp;
    setMediaError(null); setSourceError(null);
    setSource('loopito'); setLpPulso(lp.pulso); setMediaStream(lp.stream); setIsStarted(true);
  };

  const switchToWebcam = async () => {
    try {
      const vc = selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true;
      const ac = selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true;
      const s = await navigator.mediaDevices.getUserMedia({ video: vc, audio: ac });
      if (lpRef.current) { lpRef.current.cerrar(); lpRef.current = null; }
      setSourceError(null); setPermissionsGranted(true);
      setSource('webcam'); setLpPulso(null); setMediaStream(s);
    } catch (e) { setSourceError(`Webcam: ${e.message}`); }
  };

  // Reset a cero — NO toca los dispositivos seleccionados ni el mapeo MIDI,
  // solo los parámetros visuales. Seguro de usar en pleno set.
  const handleReset = () => setSettings({ ...DEFAULT_SETTINGS });

  // --- SALIDA POP-UP ---
  const [outputWindow, setOutputWindow] = useState(null);
  const [outputRes, setOutputRes] = useState('1280x720');

  const openOutput = () => {
    if (outputWindow && !outputWindow.closed) { outputWindow.focus(); return; }
    const [w, h] = outputRes.split('x').map(Number);
    const win = window.open('', 'D3U5_OUTPUT',
      `width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no,scrollbars=no`);
    if (!win) { setMediaError('El navegador bloqueó el pop-up. Permítelo para este sitio.'); return; }

    win.document.title = 'D3U5 OUTPUT';
    win.document.body.style.cssText = 'margin:0;padding:0;background:#000;overflow:hidden;';
    win.document.documentElement.style.cssText = 'margin:0;padding:0;background:#000;overflow:hidden;';

    // window.open dimensiona la ventana EXTERNA (incluye barra de título).
    // Compensamos el delta para que el área de cliente sea exacta → captura 1:1 en OBS.
    const fit = () => {
      const dw = win.outerWidth - win.innerWidth;
      const dh = win.outerHeight - win.innerHeight;
      if (dw >= 0 && dh >= 0 && (dw || dh)) win.resizeTo(w + dw, h + dh);
    };
    setTimeout(fit, 80);
    setTimeout(fit, 400); // segundo intento por si el layout tardó

    win.addEventListener('pagehide', () => setOutputWindow(null));
    window.addEventListener('beforeunload', () => { try { win.close(); } catch (e) {} });
    setOutputWindow(win);
  };

  const closeOutput = () => {
    if (outputWindow && !outputWindow.closed) outputWindow.close();
    setOutputWindow(null);
  };

  useEffect(() => { openOutputRef.current = openOutput; });

  const handleLoadLPD8 = () => {
    const m = buildLPD8Mappings();
    midiMappingsRef.current = m;
    setMidiMappings(m);
  };

  const handleClearMidiMapping = (paramKey) => {
    const nm = { ...midiMappingsRef.current };
    Object.keys(nm).forEach(k => { if (nm[k].param === paramKey) delete nm[k]; });
    midiMappingsRef.current = nm;
    setMidiMappings({ ...nm });
  };

  return React.createElement(React.Fragment, null,
    !isStarted
      ? React.createElement(InitialScreen, { onStart: handleStart, error: mediaError, videoDevices, audioDevices, selectedVideoId, selectedAudioId, onVideoSelect: id => setSelectedVideoId(id), onAudioSelect: id => setSelectedAudioId(id), permissionsGranted, onPermissionRequest: handlePermissionRequest, loopitoIp, onLoopitoIp: setLoopitoIp, onStartLoopito: connectLoopito })
      : React.createElement("main", { className: "relative h-screen w-screen bg-black", style: { overflow: 'hidden' } },
          mediaStream && React.createElement(Visualizer, { settings, stream: mediaStream, pulso: lpPulso, onAudioLevels: setAudioLevels, outputWindow, fxTriggerRef, fxAmountRef }),

          // Placeholder cuando el render se mudó al pop-up
          outputWindow && React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center pointer-events-none" },
            React.createElement("p", { className: "text-cyan-500/70 font-mono text-2xl tracking-widest animate-pulse" }, "▶ SALIDA ACTIVA"),
            React.createElement("p", { className: "text-gray-600 font-mono text-xs mt-2" }, "El render vive en la ventana \"D3U5 OUTPUT\"")
          ),

          // Toggle button — always visible, slides with panel
          React.createElement("button", {
            onClick: () => setIsControlsVisible(p => !p),
            title: "Menú [M]",
            style: { right: (isControlsVisible && !outputWindow) ? '324px' : '16px', transition: 'right 0.32s cubic-bezier(0.4,0,0.2,1)' },
            className: "fixed top-4 z-50 w-10 h-10 bg-gray-900/85 border border-cyan-500/40 rounded-lg text-cyan-400 text-lg flex items-center justify-center hover:bg-gray-800 hover:border-cyan-400 transition-colors shadow-lg"
          }, isControlsVisible ? '✕' : '☰'),

          React.createElement(Controls, {
            settings, setSettings, isVisible: isControlsVisible,
            videoDevices, audioDevices, selectedVideoId, selectedAudioId,
            onVideoDeviceSelect: changeVideoDev, onAudioDeviceSelect: changeAudioDev,
            midiMappings, midiLearnParam, onMidiLearn: setMidiLearnParam,
            onClearMidiMapping: handleClearMidiMapping, onLoadLPD8: handleLoadLPD8,
            midiConnected, midiDeviceName, audioLevels,
            onReset: handleReset,
            outputActive: !!outputWindow, outputRes, onOutputRes: setOutputRes,
            onOpenOutput: openOutput, onCloseOutput: closeOutput,
            onPadDown: padDown, onPadUp: padUp, padMap, padLearn, padHeld,
            onPadLearnStart: () => setPadLearn(p => p >= 0 ? -1 : 0),
            fxAmount, onFxAmount: (i, v) => setFxAmount(a => { const n = [...a]; n[i] = v; return n; }),
            source, loopitoIp, onLoopitoIp: setLoopitoIp, onConnectLoopito: connectLoopito,
            onUseWebcam: switchToWebcam, loopito: lpRef.current, sourceError
          }),

          !isControlsVisible && React.createElement("div", { className: "fixed bottom-4 left-4 text-white/30 text-xs font-mono pointer-events-none select-none" },
            React.createElement("p", null, "D3U5 v9.2"),
            React.createElement("p", null, "[M] Menú")
          )
        )
  );
};

const container = document.getElementById('root');
if (container) createRoot(container).render(React.createElement(React.StrictMode, null, React.createElement(App, null)));