/* Fondo de yosoydeus.com: «génesis». Una misma nube de ~350 partículas que cambia de forma con el scroll:
     1. constelación (hero)        : Libra, con sus 8 estrellas y líneas.
     2. ensamble   (Selected work) : llegan piezas desde afuera y se enlazan; la molécula se estira hasta ser un ADN.
     3. hélix      (mitad del sitio): doble hélix completa con pares de bases, que sigue girando con el scroll.
     4. cristal    (skills y after): el hélix se descompone y cristaliza en una estructura geométrica anidada
                                     (icosaedro geodésico + poliedros interiores + dos anillos orbitales).
   Todo depende de dónde estés en la página (se puede volver atrás).
   El primer paso no es una molécula sino la constelación de Libra (posiciones reales de sus estrellas).
   Profundidad de campo: lo lejos y lo cerca se desenfoca; partículas flotantes con bokeh; un bloom suave sobre todo el lienzo. Cada sección puede pedir color con data-hue.
   Con prefers-reduced-motion no se congela: pasa a modo calmo (más lento, sin entrada ni rayitas, el scroll sin suavizado).
   Baja la calidad si el equipo no da. Sin dependencias. */
(function () {
  "use strict";
  if (window.__deusGenesis) return;
  window.__deusGenesis = true;

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = document.createElement("canvas");
  cv.id = "deus-bg";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:-5;pointer-events:none";
  var ctx = cv.getContext("2d");
  if (!ctx) return;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function wrap360(h) { return ((h % 360) + 360) % 360; }
  function wrapDiff(d) { return ((d + 540) % 360) - 180; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); } // aleatorio estable

  /* ---------------------------------------------------------------- geometría de la estructura final */
  function icosa() {
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    var f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { v: v, f: f };
  }
  function subdivide(m) {
    var cache = {}, v = m.v.slice(), f = [];
    function mid(a, b) {
      var k = a < b ? a + "_" + b : b + "_" + a;
      if (cache[k] !== undefined) return cache[k];
      v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]));
      cache[k] = v.length - 1;
      return cache[k];
    }
    m.f.forEach(function (t) {
      var a = mid(t[0], t[1]), b = mid(t[1], t[2]), c = mid(t[2], t[0]);
      f.push([t[0], a, c], [t[1], b, a], [t[2], c, b], [a, b, c]);
    });
    return { v: v, f: f };
  }
  function faceEdges(m) {
    var seen = {}, out = [];
    m.f.forEach(function (t) {
      for (var i = 0; i < 3; i++) {
        var a = t[i], b = t[(i + 1) % 3], k = a < b ? a + "_" + b : b + "_" + a;
        if (!seen[k]) { seen[k] = 1; out.push([a, b]); }
      }
    });
    return out;
  }
  function nearestEdges(v, k) { // aristas = pares a la distancia mínima (poliedros regulares)
    var min = 1e9, i, j, d;
    for (i = 0; i < v.length; i++) for (j = i + 1; j < v.length; j++) { d = dist(v[i], v[j]); if (d < min) min = d; }
    var out = [];
    for (i = 0; i < v.length; i++) for (j = i + 1; j < v.length; j++) if (dist(v[i], v[j]) < min * k) out.push([i, j]);
    return out;
  }
  function dist(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  var ico0 = icosa(), ico1 = subdivide(ico0), ico2 = subdivide(ico1);
  var PHI = (1 + Math.sqrt(5)) / 2;
  var dodV = [];
  [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { dodV.push(norm([a, b, c])); }); }); });
  [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) {
    dodV.push(norm([0, a / PHI, b * PHI]), norm([a / PHI, b * PHI, 0]), norm([a * PHI, 0, b / PHI]));
  }); });

  /* ---------------------------------------------------------------- partículas
     Se construyen en el espacio del hélix (índice h) y luego se les asigna un destino en la estructura final. */
  var M = 130; // puntos por hebra
  var H_Y = [], H_J = [], H_T = [], H_F = [], idxA = [], idxB = [], rungs = [];
  (function () {
    var j;
    for (j = 0; j < M; j++) { idxA[j] = H_Y.length; H_Y.push(j / (M - 1) - 0.5); H_J.push(j); H_T.push(0); H_F.push(0); }
    for (j = 0; j < M; j++) { idxB[j] = H_Y.length; H_Y.push(j / (M - 1) - 0.5); H_J.push(j); H_T.push(1); H_F.push(0); }
    for (j = 1; j < M - 1; j += 3) {
      var d1 = H_Y.length;
      H_Y.push(j / (M - 1) - 0.5); H_J.push(j); H_T.push(2); H_F.push(1 / 3);
      H_Y.push(j / (M - 1) - 0.5); H_J.push(j); H_T.push(2); H_F.push(2 / 3);
      rungs.push([idxA[j], d1, d1 + 1, idxB[j]]);
    }
  })();
  var N = H_Y.length;

  // Destinos de la estructura final: [x,y,z unitarios, radio, grupo]. Grupos: 0..3 poliedros anidados, 4 anillo 1, 5 anillo 2, 6 centro
  var F_U = [], F_R = [], F_G = [], F_EDGES = [];
  var shellStart = {};
  function addShell(g, verts, r, edges) {
    var base = F_U.length;
    shellStart[g] = base;
    verts.forEach(function (v) { F_U.push(v); F_R.push(r); F_G.push(g); });
    edges.forEach(function (e) { F_EDGES.push([base + e[0], base + e[1]]); });
    return base;
  }
  var gA = addShell(0, ico2.v, 1.0, faceEdges(ico2));
  var gB = addShell(1, ico1.v, 0.68, faceEdges(ico1));
  var gC = addShell(2, dodV, 0.44, nearestEdges(dodV, 1.2));
  var gD = addShell(3, ico0.v, 0.24, faceEdges(ico0));
  var tetraV = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norm);
  var gT = addShell(6, tetraV, 0.09, nearestEdges(tetraV, 1.2));
  function nearestLinks(from, fromV, to, toV) { // rayos entre capas: cada vértice al más cercano de la capa siguiente
    for (var i = 0; i < fromV.length; i++) {
      var best = 0, bd = -2;
      for (var j = 0; j < toV.length; j++) { var d = dot(fromV[i], toV[j]); if (d > bd) { bd = d; best = j; } }
      F_EDGES.push([from + i, to + best]);
    }
  }
  nearestLinks(gB, ico1.v, gA, ico2.v);
  nearestLinks(gC, dodV, gB, ico1.v);
  nearestLinks(gD, ico0.v, gC, dodV);
  var ring2Count = N - F_U.length - 60;
  var ringStart1 = F_U.length;
  (function () {
    var i;
    for (i = 0; i < 60; i++) { F_U.push([Math.cos(i / 60 * TAU), 0, Math.sin(i / 60 * TAU)]); F_R.push(1.26); F_G.push(4); }
    for (i = 0; i < 60; i++) F_EDGES.push([ringStart1 + i, ringStart1 + (i + 1) % 60]);
    var s2 = F_U.length;
    for (i = 0; i < ring2Count; i++) { F_U.push([Math.cos(i / ring2Count * TAU), 0, Math.sin(i / ring2Count * TAU)]); F_R.push(1.26); F_G.push(5); }
    for (i = 0; i < ring2Count; i++) F_EDGES.push([s2 + i, s2 + (i + 1) % ring2Count]);
  })();
  // radio aproximado de las capas para el color y el tamaño
  var G_HUE = [0, 28, 56, 84, 150, 190, 40];
  var G_SIZE = [8, 11, 14, 17, 12, 12, 18];

  // Correspondencia h -> g emparejando por altura (así cada partícula viaja poco y de forma coherente)
  var map = new Int32Array(N), inv = new Int32Array(N);
  (function () {
    var hs = [], gs = [], i;
    for (i = 0; i < N; i++) hs.push(i);
    for (i = 0; i < N; i++) gs.push(i);
    hs.sort(function (a, b) { return H_Y[a] - H_Y[b]; });
    gs.sort(function (a, b) { return F_U[a][1] * F_R[a] - F_U[b][1] * F_R[b]; });
    for (i = 0; i < N; i++) { map[hs[i]] = gs[i]; inv[gs[i]] = hs[i]; }
  })();

  // Aristas del hélix y de la estructura final, en el espacio h
  var E_H = [], E_F = [], E_M = [];
  (function () {
    var j;
    for (j = 0; j < M - 1; j++) { E_H.push([idxA[j], idxA[j + 1], 0]); E_H.push([idxB[j], idxB[j + 1], 1]); }
    rungs.forEach(function (r) { E_H.push([r[0], r[1], 2], [r[1], r[2], 2], [r[2], r[3], 2]); });
    F_EDGES.forEach(function (e) { E_F.push([inv[e[0]], inv[e[1]], F_G[e[0]]]); });
  })();

  // Constelación de Libra: 8 estrellas reales (ascensión recta en horas, declinación en grados, magnitud, matiz)
  // proyectadas con el este a la izquierda, como en un mapa del cielo. Ocupan los puntos del centro del hélix.
  var K = 8;
  var STARS = [
    [14.848, -16.04, 2.75, 48],  // α2 Librae · Zubenelgenubi
    [15.283, -9.38, 2.61, 205],  // β Librae · Zubeneschamali
    [15.592, -14.79, 3.91, 38],  // γ Librae · Zubenelhakrabi
    [15.068, -25.28, 3.29, 14],  // σ Librae · Brachium
    [15.617, -28.13, 3.58, 32],  // υ Librae
    [15.644, -29.78, 3.66, 210], // τ Librae
    [15.198, -19.79, 4.54, 200], // ι Librae
    [15.898, -16.73, 4.15, 45]   // θ Librae
  ];
  var STAR_HUE = STARS.map(function (st) { return st[3]; });
  var molAtoms = []; // [x, y, z, tamaño] en unidades de la constelación
  var molBonds = [[0, 1], [1, 2], [2, 7], [2, 3], [3, 0], [3, 4], [4, 5], [0, 6], [6, 3]];
  (function () {
    var ra0 = 15.3, dec0 = -18, c0 = Math.cos(dec0 * Math.PI / 180);
    STARS.forEach(function (st, i) {
      var x = (ra0 - st[0]) * 15 * c0 / 12, y = -(st[1] - dec0) / 12;
      molAtoms.push([x * 1.9, y * 1.9, (rnd(i + 40) - 0.5) * 0.35, Math.max(0.45, 1.55 - 0.25 * st[2])]);
    });
    var mxs = 0, mys = 0; // se centra por el centroide: así queda justo detrás del nombre
    molAtoms.forEach(function (a) { mxs += a[0]; mys += a[1]; });
    mxs /= molAtoms.length; mys /= molAtoms.length;
    molAtoms.forEach(function (a) { a[0] -= mxs; a[1] -= mys; });
  })();

  // Estado por partícula
  var TH = new Float32Array(N), OF = new Float32Array(N), MOLK = new Int8Array(N).fill(-1);
  var FAR = new Float32Array(N * 3);
  (function () {
    var order = [], i;
    for (i = 0; i < N; i++) { TH[i] = Math.abs(H_Y[i]) * 2 + rnd(i) * 0.06; OF[i] = rnd(i + 900); order.push(i); }
    order.sort(function (a, b) { return TH[a] - TH[b]; });
    for (i = 0; i < K; i++) { MOLK[order[i]] = i; TH[order[i]] = 0.02 + i * 0.006; }
    for (i = 0; i < N; i++) { // posición de origen de las piezas: lejos, en una cáscara
      var d = norm([rnd(i + 1) * 2 - 1, rnd(i + 2) * 2 - 1, rnd(i + 3) * 2 - 1]);
      var r = 1.2 + rnd(i + 4) * 0.9;
      FAR[i * 3] = d[0] * r; FAR[i * 3 + 1] = d[1] * r; FAR[i * 3 + 2] = d[2] * r;
    }
  })();
  var DPH = new Float32Array(N * 3), DSP = new Float32Array(N * 3), TWK = new Float32Array(N * 2); // deriva (fase, velocidad) y titileo (velocidad, ¿destella?)
  (function () {
    for (var i = 0; i < N; i++) {
      for (var c = 0; c < 3; c++) { DPH[i * 3 + c] = rnd(i * 7 + c + 500) * TAU; DSP[i * 3 + c] = 0.22 + rnd(i * 7 + c + 700) * 0.5; }
      TWK[i * 2] = 0.7 + rnd(i + 1300) * 1.7;
      TWK[i * 2 + 1] = rnd(i + 1500) < 0.17 ? 1 : 0;
    }
  })();
  var molRankOf = []; // rango -> índice h
  (function () { for (var i = 0; i < N; i++) if (MOLK[i] >= 0) molRankOf[MOLK[i]] = i; })();
  var E_MOL = molBonds.map(function (b) { return [molRankOf[b[0]], molRankOf[b[1]]]; });

  /* ---------------------------------------------------------------- lienzo y estado */
  var W = 0, H = 0, dpr = 1, narrow = false;
  var sy = window.pageYOffset || 0, t = 0;
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var hueA = 195, hueD = 80, tHueA = 195, tHueD = 80;
  var low = false, slowFrames = 0, ema = 0.016, tier = 0; // tier 0 = todo · 1 = sin bloom ni extras · 2 = ligero
  var svel = 0, prevSy = sy; // velocidad del scroll (px/s), suavizada
  var introT = reduce ? 99 : 0; // segundos desde que arrancó la animación de entrada (constelación que se forma)
  var spinAcc = 0; // giro acumulado de la estructura final
  var anchors = { work: 0, skills: 0, fin: 0, doc: 0, cardH: 0, footH: 0 };
  var camY = 0;

  var INT = 0.78; // intensidad general (el bloom devuelve parte del brillo)
  var sprites = {};
  // lvl 0 = enfocado · 1 = suave · 2 = bokeh (disco con borde)
  function sprite(h, lvl) {
    h = wrap360(Math.round(h / 5) * 5);
    lvl = lvl || 0;
    var key = h + "_" + lvl;
    var s = sprites[key];
    if (s) return s;
    s = document.createElement("canvas");
    s.width = s.height = 64;
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    var c = function (l, al) { return "hsla(" + h + ",100%," + l + "%," + al + ")"; };
    if (lvl === 0) {
      gr.addColorStop(0, c(94, 1)); gr.addColorStop(0.16, c(72, 0.95)); gr.addColorStop(0.45, c(56, 0.28)); gr.addColorStop(1, c(50, 0));
    } else if (lvl === 1) {
      gr.addColorStop(0, c(88, 0.8)); gr.addColorStop(0.22, c(68, 0.6)); gr.addColorStop(0.55, c(55, 0.2)); gr.addColorStop(1, c(50, 0));
    } else {
      gr.addColorStop(0, c(78, 0.3)); gr.addColorStop(0.55, c(62, 0.34)); gr.addColorStop(0.82, c(66, 0.55)); gr.addColorStop(0.95, c(60, 0.16)); gr.addColorStop(1, c(55, 0));
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    sprites[key] = s;
    return s;
  }

  // bloom: copias del lienzo a 1/2, 1/4 y 1/8 que se suman encima (no usa ctx.filter, así funciona en Safari)
  var bl = [];
  function makeBloom() {
    bl = [];
    for (var k = 1; k <= 3; k++) {
      var c = document.createElement("canvas");
      c.width = Math.max(8, Math.round(cv.width / Math.pow(2, k)));
      c.height = Math.max(8, Math.round(cv.height / Math.pow(2, k)));
      var g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      bl.push({ c: c, g: g });
    }
  }
  function bloom() {
    var src = cv, k;
    for (k = 0; k < 3; k++) {
      var o = bl[k];
      o.g.globalCompositeOperation = "copy";
      o.g.drawImage(src, 0, 0, src.width, src.height, 0, 0, o.c.width, o.c.height);
      src = o.c;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(bl[2].c, 0, 0, cv.width, cv.height);
    ctx.globalAlpha = 0.34;
    ctx.drawImage(bl[1].c, 0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    narrow = window.innerWidth < 760;
    dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 1.75);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeBloom();
  }

  /* --- color y anclas por sección --- */
  var hueEls = [];
  function absTop(el) { return el ? el.getBoundingClientRect().top + (window.pageYOffset || 0) : 0; }
  function collect() {
    hueEls = [].slice.call(document.querySelectorAll("[data-hue]"));
    anchors.work = absTop(document.getElementById("deus-work"));
    anchors.skills = absTop(document.getElementById("deus-skills"));
    anchors.fin = absTop(document.getElementById("deus-finale"));
    anchors.doc = document.documentElement.scrollHeight;
    var cd = document.querySelector("#deus-finale .deus-finale-card"), ft = document.querySelector(".deus-footer");
    anchors.cardH = cd ? cd.offsetHeight : 0;
    anchors.footH = ft ? ft.offsetHeight : 0;
  }
  function pickHue() {
    var mid = H * 0.5, found = null;
    for (var i = 0; i < hueEls.length; i++) {
      var r = hueEls[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { found = hueEls[i]; break; }
    }
    if (found) {
      var a = parseFloat(found.getAttribute("data-hue")), b = parseFloat(found.getAttribute("data-hue-b"));
      tHueA = a;
      tHueD = isNaN(b) ? 80 : wrapDiff(b - a);
    } else { tHueA = 195; tHueD = 80; }
  }

  /* --- proyección --- */
  var cam = { cx: 0.5, scale: 1, pitch: 0, roll: 0, yaw: 0 };
  var SX = new Float32Array(N), SY = new Float32Array(N), SP = new Float32Array(N), SV = new Float32Array(N);
  var AI = new Float32Array(N), FI = new Float32Array(N), BOOST = new Float32Array(N), HUE = new Float32Array(N), SIZE = new Float32Array(N);
  var proj = { x: 0, y: 0, p: 1 };
  function project(x, y, z, F) {
    var cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
    var x1 = x * cr - y * sr, y1 = x * sr + y * cr;
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;
    var cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw);
    var x3 = x1 * cyw + z2 * syw, z3 = -x1 * syw + z2 * cyw;
    var d = F + z3;
    if (d < 140) { proj.p = -1; return proj; }
    var p = F / d;
    proj.x = cam.cx * W + x3 * p;
    proj.y = H * 0.5 + camY + y2 * p;
    proj.p = p;
    return proj;
  }
  function depthAlpha(p) {
    var a = 0.34 + 0.7 * (p - 0.55);
    if (p > 1.2) a *= Math.max(0.2, 1 - (p - 1.2) * 1.5);
    return Math.min(0.9, Math.max(0.08, a));
  }

  /* --- aristas por cubetas de opacidad (un trazo por cubeta, no uno por arista) --- */
  var NB = 12;
  var buckets = [];
  for (var bi = 0; bi < NB; bi++) buckets.push([]);
  function bucketsReset() { for (var i = 0; i < NB; i++) buckets[i].length = 0; }
  function bucketsAdd(x1, y1, x2, y2, a) {
    if (a < 0.02) return;
    var b = Math.min(NB - 1, Math.floor(a * NB));
    var arr = buckets[b];
    arr.push(x1, y1, x2, y2);
  }
  function bucketsStroke(hue, lw, mult, light) {
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var b = 0; b < NB; b++) {
      var arr = buckets[b];
      if (!arr.length) continue;
      ctx.beginPath();
      var lx = NaN, ly = NaN; // si un tramo empieza donde terminó el anterior, sigue el mismo trazo (sin muescas ni dobles brillos en la unión)
      for (var i = 0; i < arr.length; i += 4) {
        if (arr[i] !== lx || arr[i + 1] !== ly) ctx.moveTo(arr[i], arr[i + 1]);
        ctx.lineTo(arr[i + 2], arr[i + 3]);
        lx = arr[i + 2]; ly = arr[i + 3];
      }
      ctx.strokeStyle = "hsla(" + wrap360(hue) + ",100%," + (light || 68) + "%," + Math.min(0.95, ((b + 0.5) / NB) * mult * INT) + ")";
      ctx.stroke();
    }
  }

  /* ---------------------------------------------------------------- fotograma */
  // Partículas flotantes (ligeras, todas con sprites o trazos por lote):
  //   k0 puntos en 3 planos (lejos nítidos · medio suaves · cerca bokeh) con deriva y destellos
  //   k1 microcúmulos: 3-6 puntos que giran en grupo unidos por líneas finas
  //   k2 esquirlas: rombos pequeños que giran
  //   k3 manchas grandes de primer plano que cruzan la pantalla muy desenfocadas
  //   y rayitas de velocidad detrás de los puntos cuando scrolleas rápido
  var FL = [];
  (function () {
    var i, R = Math.random;
    for (i = 0; i < 170; i++) FL.push({ k: 0, x: R(), y: R(), z: Math.pow(R(), 0.8), ph: R() * TAU, hs: R(), dr: R() - 0.5 });
    for (i = 0; i < 30; i++) FL.push({ k: 1, x: R(), y: R(), z: 0.2 + R() * 0.55, ph: R() * TAU, hs: R(), n: 3 + Math.floor(R() * 4), r: 14 + R() * 24, a0: R() * TAU, sp: (R() - 0.5) * 0.5, dr: R() - 0.5 });
    for (i = 0; i < 64; i++) FL.push({ k: 2, x: R(), y: R(), z: 0.15 + R() * 0.7, ph: R() * TAU, hs: R(), s: 2.5 + R() * 4.5, rot: R() * TAU, sp: (R() - 0.5) * 1.4, dr: R() - 0.5 });
    for (i = 0; i < 12; i++) FL.push({ k: 3, x: R(), y: R(), z: 1, ph: R() * TAU, hs: R(), s: 120 + R() * 170, vx: (R() < 0.5 ? -1 : 1) * (22 + R() * 40), vy: (R() - 0.5) * 18 });
    // microorganismos: nadan solos (aunque no muevas nada), con ondulación y una estela corta
    for (i = 0; i < 28; i++) FL.push({ k: 4, x: R(), y: R(), z: 0.25 + R() * 0.6, ph: R() * TAU, hs: R(), vx: (R() - 0.5) * 38, vy: (R() - 0.5) * 28, w: 0.8 + R() * 1.4, amp: 6 + R() * 12, len: 3 + Math.floor(R() * 3) });
  })();
  var segC = [], segS = [];
  function mod(v, m) { return ((v % m) + m) % m; }
  function drawFloaters(front) {
    var span = H * 1.25, wspan = W * 1.2, rich = tier === 0, i, j, q, z, xx, yy, tw, size, al, lvl;
    var sv = Math.max(-2400, Math.min(2400, svel));
    segC.length = 0; segS.length = 0;
    for (i = 0; i < FL.length; i++) {
      q = FL[i]; z = q.z;
      tw = 0.62 + 0.38 * Math.sin(t * (0.5 + z) * 1.3 + q.ph);
      if (q.k === 0 && i % 4 === 0) tw += Math.max(0, Math.sin(t * 0.7 + q.ph * 3) - 0.86) * 6; // destello ocasional
      if (q.k === 3) { // mancha de primer plano
        if (!front || tier > 1) continue;
        xx = mod(q.x * W * 1.5 + t * q.vx - px * 140, W * 1.5) - W * 0.25;
        yy = mod(q.y * span * 1.2 - sy * 0.62 + t * q.vy, span * 1.2) - H * 0.15;
        ctx.globalAlpha = 0.11 * INT * tw * 1.4;
        ctx.drawImage(sprite(hueA + hueD * q.hs, 2), xx - q.s / 2, yy - q.s / 2, q.s, q.s);
        continue;
      }
      if (q.k === 4) { // microorganismo
        if (front || tier > 1) continue;
        var bsz = (12 + 12 * q.z) * (1 + 0.25 * Math.sin(t * 2.2 + q.ph)), hm = hueA + hueD * q.hs;
        for (j = q.len; j >= 0; j--) {
          var tt = t - j * 0.1;
          var bxm = mod(q.x * wspan + q.vx * tt * (0.4 + q.z) + Math.sin(tt * q.w + q.ph) * q.amp * (0.6 + q.z) - px * (10 + 60 * q.z), wspan) - W * 0.1;
          var bym = mod(q.y * span + q.vy * tt * (0.4 + q.z) + Math.cos(tt * q.w * 0.8 + q.ph) * q.amp * (0.6 + q.z) - sy * (0.03 + 0.26 * q.z), span) - H * 0.12;
          var fall = 1 - j / (q.len + 1), szm = bsz * (j === 0 ? 1 : 0.8 * fall);
          ctx.globalAlpha = Math.min(1, (j === 0 ? 0.95 : 0.55 * fall) * INT * 1.3);
          ctx.drawImage(sprite(hm, j === 0 ? 0 : 1), bxm - szm / 2, bym - szm / 2, szm, szm);
        }
        continue;
      }
      var par = 0.03 + 0.26 * z; // más cerca = más paralaje con el scroll y el puntero
      yy = mod(q.y * span - sy * par - t * (4 + 22 * z), span) - H * 0.12;
      yy += Math.sin(t * 0.45 * (0.6 + z) + q.ph * 1.7) * (5 + 15 * z); // vaivén vertical, como flotando en el agua
      xx = mod(q.x * wspan + (q.dr || 0) * t * (6 + 22 * z) - px * (8 + 70 * z), wspan) - W * 0.1 + Math.sin(t * 0.2 * (0.5 + z) + q.ph) * (10 + 46 * z) + Math.sin(t * 0.37 + q.ph * 2.3 + yy * 0.003) * (4 + 12 * z);
      if (q.k === 0) {
        lvl = z > 0.74 ? 2 : z > 0.42 ? 1 : 0;
        if ((lvl === 2) !== front) continue;
        if (low && lvl > 0 && i % 2) continue;
        if (lvl === 2) { size = 30 + 62 * (z - 0.74) / 0.26; al = 0.1 * tw; }
        else if (lvl === 1) { size = 10 + 12 * (z - 0.42) / 0.32; al = 0.24 * tw; }
        else { size = 4 + 5 * z / 0.42; al = 0.5 * tw; }
        ctx.globalAlpha = Math.min(1, al * INT * 1.25);
        ctx.drawImage(sprite(hueA + hueD * q.hs, lvl), xx - size / 2, yy - size / 2, size, size);
        if (rich && lvl < 2 && Math.abs(sv) > 90) { var len = Math.max(-80, Math.min(80, sv * 0.012 * (0.3 + z))); segS.push(xx, yy, xx, yy + len); }
      } else if (q.k === 1) { // microcúmulo
        if (front || !rich) continue;
        var pj0x = 0, pj0y = 0, pjx = 0, pjy = 0, hh = sprite(hueA + hueD * q.hs, 0);
        ctx.globalAlpha = Math.min(1, 0.55 * tw * INT * 1.3);
        for (j = 0; j < q.n; j++) {
          var ang = q.a0 + t * q.sp + (j * TAU) / q.n, rad = q.r * (0.7 + 0.3 * Math.sin(t * 0.8 + j + q.ph)) * (0.6 + z * 0.6);
          pjx = xx + Math.cos(ang) * rad; pjy = yy + Math.sin(ang) * rad * 0.8;
          ctx.drawImage(hh, pjx - 3.5, pjy - 3.5, 7, 7);
          segC.push(xx, yy, pjx, pjy);
          if (j) segC.push(pj0x, pj0y, pjx, pjy); else { /* se cierra con el último */ }
          pj0x = pjx; pj0y = pjy;
        }
        // cierra el anillo
        var a1 = q.a0 + t * q.sp, r1 = q.r * (0.7 + 0.3 * Math.sin(t * 0.8 + q.ph)) * (0.6 + z * 0.6);
        segC.push(pjx, pjy, xx + Math.cos(a1) * r1, yy + Math.sin(a1) * r1 * 0.8);
        ctx.globalAlpha = Math.min(1, 0.6 * tw * INT);
        ctx.drawImage(sprite(hueA + hueD * q.hs, 1), xx - 6, yy - 6, 12, 12);
      } else { // esquirla
        if (front || !rich) continue;
        var sz = q.s * (0.6 + z), rt = q.rot + t * q.sp, cx0 = Math.cos(rt) * sz, cy0 = Math.sin(rt) * sz;
        ctx.globalAlpha = Math.min(1, 0.5 * tw * INT * 1.2);
        ctx.fillStyle = "hsl(" + wrap360(hueA + hueD * q.hs) + ",90%,72%)";
        ctx.beginPath();
        ctx.moveTo(xx + cx0, yy + cy0);
        ctx.lineTo(xx - cy0 * 0.55, yy + cx0 * 0.55);
        ctx.lineTo(xx - cx0, yy - cy0);
        ctx.lineTo(xx + cy0 * 0.55, yy - cx0 * 0.55);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (segC.length) { // todas las líneas de los cúmulos de un solo trazo
      ctx.beginPath();
      for (j = 0; j < segC.length; j += 4) { ctx.moveTo(segC[j], segC[j + 1]); ctx.lineTo(segC[j + 2], segC[j + 3]); }
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = "hsla(" + wrap360(hueA + hueD * 0.5) + ",90%,75%," + 0.22 * INT + ")";
      ctx.stroke();
    }
    if (segS.length) { // rayitas de velocidad
      ctx.beginPath();
      for (j = 0; j < segS.length; j += 4) { ctx.moveTo(segS[j], segS[j + 1]); ctx.lineTo(segS[j + 2], segS[j + 3]); }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "hsla(" + wrap360(hueA + hueD * 0.3) + ",90%,80%," + Math.min(0.4, Math.abs(sv) / 6000) + ")";
      ctx.stroke();
    }
  }

  function stage() {
    if (window.__deusStage) return window.__deusStage; // para pruebas: {a, f}
    var Hh = Math.max(600, H);
    var ready = anchors.work > 0 && anchors.skills > anchors.work; // hasta que las secciones estén en su lugar, usa medidas por defecto
    var aS = 0.05 * Hh;
    var aE = (ready ? anchors.work : 1.0 * Hh) + 0.7 * Hh;
    var yS = ready ? anchors.skills : 6 * Hh;
    return { a: clamp01((sy - aS) / Math.max(200, aE - aS)), f: clamp01((sy - (yS - 2.1 * Hh)) / (1.95 * Hh)) };
  }

  var hueTick = 0;
  function render(dt, animate, rdt) {
    var target = window.pageYOffset || 0;
    var diff = target - sy;
    var sd = Math.min(0.35, rdt || dt); // el suavizado del scroll usa el tiempo real: en equipos lentos no se queda atrás
    var live = animate && !reduce; // en modo calmo el scroll va directo, sin inercia ni rayitas
    sy += live ? diff * Math.min(1, sd * 7) : diff;
    var push = live ? Math.max(-3, Math.min(3, (target - sy) / 40)) : 0;
    var instV = live ? (sy - prevSy) / Math.max(0.004, sd) : 0; // px/s
    prevSy = sy;
    svel += (instV - svel) * Math.min(1, sd * 6);
    px += (tpx - px) * Math.min(1, dt * 3);
    py += (tpy - py) * Math.min(1, dt * 3);
    hueTick -= dt;
    if (hueTick <= 0 || !animate) { hueTick = 0.15; pickHue(); }
    var k = animate ? Math.min(1, sd * 2.4) : 1;
    hueA = wrap360(hueA + wrapDiff(tHueA - hueA) * k);
    hueD += (tHueD - hueD) * k;

    var st = stage();
    var a = st.a, f = st.f;

    var u = sy / Math.max(600, H);
    var wide = narrow ? 0.5 : 1;
    cam.cx = 0.5 + 0.31 * Math.sin(u * 0.95) * wide;
    cam.scale = 1 + 0.3 * Math.sin(u * 1.3 + 0.8);
    cam.pitch = 0.42 * Math.sin(u * 0.8 + 0.4) * (1 - f * 0.55) + py * 0.1;
    cam.roll = (0.2 * Math.sin(u * 0.55 + 1) + 0.08) * (1 - f * 0.6);
    cam.yaw = px * 0.2;
    // cierre: la estructura se centra, se endereza y sube un poco para quedar a la vista sobre el mensaje
    var finAt = anchors.fin > anchors.skills ? anchors.fin : 1e9;
    var gs = smooth((sy - (finAt - 1.7 * H)) / (1.15 * H));
    cam.cx = lerp(cam.cx, 0.5, gs);
    cam.pitch *= 1 - gs * 0.85;
    cam.roll *= 1 - gs * 0.9;
    var gd = smooth((sy - (finAt - 0.55 * H)) / (0.8 * H)); // al llegar al mensaje, se acomoda entera por encima de la tarjeta
    // hueco libre al llegar al final de la página: debajo del encabezado y encima de la tarjeta de mensaje
    var padB = narrow ? 32 : 48, topFree = 84;
    var botFree = anchors.cardH ? H - anchors.footH - padB - anchors.cardH - 14 : H * 0.62;
    var freeH = Math.max(160, botFree - topFree);
    var fitR = Math.min(freeH / 2 / 1.45, (W / 2 - 18) / 1.45); // 1.45 = anillos (1.26) + perspectiva
    camY = lerp(-H * 0.115 * gs, (topFree + botFree) / 2 - H / 2, gd);
    var Fd = Math.max(W, H) * 1.05;

    var phase = sy * 0.0042 + (animate ? t * 0.28 : 0);
    var unit = Math.min(W, H);
    var R = unit * (narrow ? 0.17 : 0.19) * cam.scale; // radio del hélix
    var Lh = H * 2.4; // largo del hélix
    var P = H * 0.56 / (1 + push * 0.14);
    var kk = TAU / P;
    var Rm = unit * (narrow ? 0.2 : 0.17); // escala de la molécula
    var preCap = Math.min((H / 2 - 74) / 1.45, (W / 2 - 18) / 1.45); // en el tramo del cierre nunca debe cortarse con el borde
    var breath = 0.5 + 0.5 * Math.sin(t * 1.05 - 1.57); // respiración de la estructura final: ~6 s por ciclo (0 = exhala, 1 = inhala)
    var RfBase = unit * (narrow ? 0.4 : 0.37) * (0.915 + 0.085 * breath) * (1 + 0.06 * gs);
    var Rf = lerp(RfBase, Math.min(RfBase, preCap), gs);
    Rf = lerp(Rf, Math.min(Rf, fitR), gd); // radio de la estructura final
    // entrada: la constelación gira desde un lado, se forma estrella por estrella y se asienta detrás del nombre
    var ik = clamp01(introT / 3.0), ie = easeOut(ik);
    var mAy = (animate ? 0.3 * Math.sin(t * 0.33 + sy * 0.002) : 0) + 1.7 * (1 - ie), mAx = (animate ? 0.1 * Math.sin(t * 0.27 + 1) + 0.06 : 0.06) + 0.5 * (1 - ie);
    var mScale = lerp(0.5, 1, ie);
    var offX = -W * 0.018, offY = -H * 0.07; // centrada detrás del título
    var cmy = Math.cos(mAy), smy = Math.sin(mAy), cmx = Math.cos(mAx), smx = Math.sin(mAx);
    if (animate) spinAcc += dt * 0.2 * (1 + gs * 0.9);
    var nAy = spinAcc + sy * 0.0008, nAx = 0.38 + 0.12 * Math.sin(t * 0.21);
    var cny = Math.cos(nAy), sny = Math.sin(nAy), cnx = Math.cos(nAx), snx = Math.sin(nAx);
    var pulseY = (((t * 0.1) % 1) + 1) % 1 - 0.5; // pulso que sube por el hélix
    var pulseR = (((t * 0.22) % 1.5) + 1.5) % 1.5; // onda que sale del centro de la estructura
    var glow = 1 + Math.min(Math.abs(push) * 0.35, 0.5);
    var gHue = hueA;
    var drift = unit * 0.013, jit = unit * 0.005; // jit: temblor propio de cada destello (solo el sprite, no las líneas)

    var i, j;
    for (i = 0; i < N; i++) {
      // 1) posición en el hélix
      var yy = H_Y[i] * Lh, aa = kk * yy + phase, hx, hz, tp = H_T[i];
      if (tp === 0) { hx = R * Math.cos(aa); hz = R * Math.sin(aa); }
      else if (tp === 1) { hx = R * Math.cos(aa + Math.PI); hz = R * Math.sin(aa + Math.PI); }
      else { var fr = H_F[i]; hx = R * Math.cos(aa) * (1 - 2 * fr); hz = R * Math.sin(aa) * (1 - 2 * fr); }
      var hy = yy;

      // 2) ensamble: de la molécula / de afuera hacia el hélix
      var ai = clamp01((a - TH[i] * 0.72) / 0.28);
      var mk = MOLK[i], bx, by, bz, vis;
      if (mk >= 0) {
        var m = molAtoms[mk];
        var mx = m[0] * Rm * 1.4 * mScale, my = m[1] * Rm * 1.4 * mScale, mz = m[2] * Rm * 1.4 * mScale;
        var x1 = mx * cmy + mz * smy, z1 = -mx * smy + mz * cmy;
        var y2 = my * cmx - z1 * smx, z2 = my * smx + z1 * cmx;
        var e = smooth(ai);
        bx = lerp(x1 + offX, hx, e); by = lerp(y2 + offY - sy * 0.28 * (1 - e), hy, e); bz = lerp(z2, hz, e);
        vis = smooth((introT - (0.35 + mk * 0.2)) / 0.55); // cada estrella aparece a su turno
      } else {
        var e2 = easeOut(ai);
        bx = lerp(FAR[i * 3] * unit, hx, e2); by = lerp(FAR[i * 3 + 1] * unit, hy, e2); bz = lerp(FAR[i * 3 + 2] * unit, hz, e2);
        vis = clamp01(ai * 2.6);
      }

      // 3) cristalización: del hélix a la estructura geométrica
      var fi = clamp01((f - OF[i] * 0.55) / 0.45);
      var g = map[i], ug = F_U[g], gg = F_G[g], X, Y, Z;
      if (gg === 4 || gg === 5) {
        var ang = Math.atan2(ug[2], ug[0]) + (animate ? t : 0) * (gg === 4 ? 0.32 : -0.24);
        var rr = Rf * F_R[g];
        var cx0 = rr * Math.cos(ang), cz0 = rr * Math.sin(ang);
        var tilt = gg === 4 ? 0.55 : -0.7, tz = gg === 4 ? 0.0 : 1.0;
        var ya = -cz0 * Math.sin(tilt), za = cz0 * Math.cos(tilt);
        X = cx0 * Math.cos(tz) - ya * Math.sin(tz); Y = cx0 * Math.sin(tz) + ya * Math.cos(tz); Z = za;
      } else {
        var rad = Rf * F_R[g] * (1 + 0.035 * Math.sin(t * 1.05 - 1.57 - gg * 0.6)); // cada capa respira con un pequeño retraso: la onda va de afuera hacia adentro
        var ux = ug[0] * rad, uy = ug[1] * rad, uz = ug[2] * rad;
        var xa = ux * cny + uz * sny, za2 = -ux * sny + uz * cny;
        var yb = uy * cnx - za2 * snx, zb = uy * snx + za2 * cnx;
        X = xa; Y = yb; Z = zb;
      }
      var ef = smooth(fi);
      var wx = lerp(bx, X, ef), wy = lerp(by, Y, ef), wz = lerp(bz, Z, ef);

      // deriva propia + corriente suave compartida: nada está del todo quieto (las estrellas de Libra se mueven menos, la estructura final también)
      var dA = drift * (mk >= 0 && ai < 0.3 ? 0.3 : 1) * (1 - 0.35 * ef); // la fase depende de la posición: los vecinos se mueven juntos y las líneas no se quiebran
      wx += (Math.sin(t * 0.43 + wy * 0.0042 + 1.3) + 0.6 * Math.sin(t * 0.21 + wy * 0.0025)) * dA;
      wy += Math.sin(t * 0.37 + wx * 0.0035) * dA * 0.6;
      wz += Math.sin(t * 0.41 + wy * 0.003 + 2) * dA;
      var pr = project(wx, wy, wz, Fd);
      SP[i] = pr.p; SX[i] = pr.x; SY[i] = pr.y; SV[i] = vis; AI[i] = ai; FI[i] = fi;

      // pulso y tamaño según el estado
      var bh = Math.exp(-Math.pow((H_Y[i] - pulseY) * 2.4, 2));
      var br = Math.exp(-Math.pow((F_R[g] * (gg >= 4 ? 1 : 1) - pulseR) / 0.16, 2));
      var flash = Math.max(0, 1 - Math.abs(ai - 0.93) / 0.09) * (mk >= 0 ? 0 : 1);
      BOOST[i] = lerp(bh * 0.55, br * 0.7, ef) + flash * 0.9 + ef * 0.34 * (0.5 + 0.5 * Math.sin(t * 1.05 - 1.57 - gg * 0.6));
      var sH = tp === 2 ? 11 : 21, sF = G_SIZE[gg] * 1.4;
      var sz = lerp(sH, sF, ef);
      if (mk >= 0 && ai < 0.3) sz = lerp(24 * molAtoms[mk][3], sz, smooth(ai / 0.3));
      SIZE[i] = sz;
      var hh = tp === 0 ? 0 : tp === 1 ? hueD : hueD * 0.5;
      HUE[i] = lerp(hueA + hh, hueA + G_HUE[gg], ef);
      if (mk >= 0 && ai < 0.3) HUE[i] = lerp(STAR_HUE[mk], HUE[i], smooth(ai / 0.3));
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    drawFloaters(false);

    var amp = narrow ? 0.45 : 1;

    // --- líneas de la constelación: crecen de una estrella a la siguiente durante la entrada
    var wM = 1 - smooth((a - 0.02) / 0.2);
    if (wM > 0.02) {
      bucketsReset();
      for (j = 0; j < E_MOL.length; j++) {
        var u0 = E_MOL[j][0], v0 = E_MOL[j][1], bu = molBonds[j][0], bv = molBonds[j][1];
        var bs = Math.max(0.35 + bu * 0.2, 0.35 + bv * 0.2) - 0.25;
        var gp = smooth((introT - bs) / 0.8);
        if (gp <= 0.01) continue;
        var ex = SX[u0] + (SX[v0] - SX[u0]) * gp, ey = SY[u0] + (SY[v0] - SY[u0]) * gp;
        bucketsAdd(SX[u0], SY[u0], ex, ey, wM * Math.min(0.95, depthAlpha((SP[u0] + SP[v0]) / 2) + 0.15));
      }
      bucketsStroke(212, 1.1, Math.max(amp, 0.8) * 0.85, 82);
    }

    // --- cintas y peldaños del hélix (tres pasadas: hebra A, hebra B, pares de bases)
    var wH = 1 - smooth((f - 0.05) / 0.5);
    if (wH > 0.02 && a > 0.02) {
      var passes = [[0, hueA, 3], [1, hueA + hueD, 3], [2, hueA + hueD * 0.5, 1.2]];
      for (var ps = 0; ps < 3; ps++) {
        bucketsReset();
        if (ps < 2) { // hebras: cada tramo se parte en 3 siguiendo una curva por los puntos vecinos, así no se ven los quiebres
          var ids = ps === 0 ? idxA : idxB;
          for (j = 0; j < M - 1; j++) {
            var p0 = ids[j], p1 = ids[j + 1];
            if (SP[p0] < 0 || SP[p1] < 0) continue;
            if ((SY[p0] < -80 && SY[p1] < -80) || (SY[p0] > H + 80 && SY[p1] > H + 80)) continue;
            var w = (1 - smooth(Math.max(FI[p0], FI[p1]) * 1.7)) * smooth((Math.min(AI[p0], AI[p1]) - 0.55) / 0.45);
            var al0 = w * 0.5 * depthAlpha((SP[p0] + SP[p1]) / 2) * wH * amp;
            if (al0 < 0.02) continue;
            var pa = ids[j > 0 ? j - 1 : 0], pb = ids[j + 2 < M ? j + 2 : M - 1];
            if (SP[pa] < 0) pa = p0;
            if (SP[pb] < 0) pb = p1;
            var lx0 = SX[p0], ly0 = SY[p0];
            for (var sg = 1; sg <= 3; sg++) {
              var uu = sg / 3, u2 = uu * uu, u3 = u2 * uu, nx0, ny0;
              if (sg === 3) { nx0 = SX[p1]; ny0 = SY[p1]; }
              else {
                nx0 = 0.5 * (2 * SX[p0] + (-SX[pa] + SX[p1]) * uu + (2 * SX[pa] - 5 * SX[p0] + 4 * SX[p1] - SX[pb]) * u2 + (-SX[pa] + 3 * SX[p0] - 3 * SX[p1] + SX[pb]) * u3);
                ny0 = 0.5 * (2 * SY[p0] + (-SY[pa] + SY[p1]) * uu + (2 * SY[pa] - 5 * SY[p0] + 4 * SY[p1] - SY[pb]) * u2 + (-SY[pa] + 3 * SY[p0] - 3 * SY[p1] + SY[pb]) * u3);
              }
              bucketsAdd(lx0, ly0, nx0, ny0, al0);
              lx0 = nx0; ly0 = ny0;
            }
          }
        } else {
          for (j = 0; j < E_H.length; j++) {
            var eh = E_H[j];
            if (eh[2] !== 2) continue;
            var q0 = eh[0], q1 = eh[1];
            var w2 = (1 - smooth(Math.max(FI[q0], FI[q1]) * 1.7)) * smooth((Math.min(AI[q0], AI[q1]) - 0.55) / 0.45);
            if (SP[q0] < 0 || SP[q1] < 0) continue;
            if ((SY[q0] < -80 && SY[q1] < -80) || (SY[q0] > H + 80 && SY[q1] > H + 80)) continue;
            bucketsAdd(SX[q0], SY[q0], SX[q1], SY[q1], w2 * 0.55 * depthAlpha((SP[q0] + SP[q1]) / 2) * wH * amp);
          }
        }
        bucketsStroke(passes[ps][1], passes[ps][2] * (ps === 2 ? 1 : 0.9), 1, ps === 2 ? 72 : 66);
      }
    }

    // --- aristas de la estructura final
    if (f > 0.02) {
      bucketsReset();
      for (j = 0; j < E_F.length; j++) {
        var ef2 = E_F[j], q0 = ef2[0], q1 = ef2[1];
        if (SP[q0] < 0 || SP[q1] < 0) continue;
        var wf = smooth((Math.min(FI[q0], FI[q1]) - 0.45) / 0.55) * Math.min(SV[q0], SV[q1]);
        if (wf < 0.03) continue;
        if ((SY[q0] < -80 && SY[q1] < -80) || (SY[q0] > H + 80 && SY[q1] > H + 80)) continue;
        bucketsAdd(SX[q0], SY[q0], SX[q1], SY[q1], wf * 0.6 * (0.74 + 0.5 * breath) * depthAlpha((SP[q0] + SP[q1]) / 2) * amp);
      }
      bucketsStroke(hueA + 40, 1, 1, 72);
    }

    // --- nucleótidos / átomos
    var every = low ? 2 : 1;
    for (i = 0; i < N; i += every) {
      var p = SP[i];
      if (p < 0) continue;
      var x = SX[i], y = SY[i];
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      var starW = MOLK[i] >= 0 ? 1 - smooth((AI[i] - 0.15) / 0.3) : 0; // las estrellas de Libra siempre enfocadas; al volverse hélix se sueltan poco a poco
      var tk = TWK[i * 2], twn = 0.78 + 0.22 * Math.sin(t * tk + DPH[i * 3]), spk = 0;
      if (TWK[i * 2 + 1]) { spk = Math.sin(t * 0.8 + DPH[i * 3 + 1]); spk = spk > 0.9 ? (spk - 0.9) / 0.1 : 0; spk *= spk * (3 - 2 * spk); twn += spk * 0.7; } // algunas destellan de vez en cuando
      twn = 1 - (1 - twn) * (1 - 0.45 * starW); // las estrellas de Libra titilan más suave
      var al = (depthAlpha(p) + BOOST[i] * 0.3) * SV[i] * glow * twn * lerp(amp, Math.max(amp, 0.85), starW);
      if (al < 0.02) continue;
      // desenfoque continuo según la distancia al plano de foco (p = 1): bt 0 = nítida · 1 = suave · 2 = bokeh, con fundido entre niveles
      var bt = 2 * smooth((Math.abs(p - 1) - 0.05) / 0.4) * (1 - starW);
      var w0 = bt < 1 ? 1 - bt : 0, w2 = bt > 1 ? bt - 1 : 0, w1 = 1 - w0 - w2;
      var szm = bt < 1 ? 1 + 0.35 * bt : 1.35 + 0.55 * (bt - 1), alm = bt < 1 ? 1 - 0.15 * bt : 0.85 - 0.25 * (bt - 1);
      var sz2 = (SIZE[i] + 6 * p + BOOST[i] * 14) * p * szm * (1 + spk * 0.45);
      var jt = jit * p * (1 - 0.7 * starW) * (1 - 0.5 * FI[i]);
      x += Math.sin(t * DSP[i * 3] + DPH[i * 3]) * jt; y += Math.sin(t * DSP[i * 3 + 1] + DPH[i * 3 + 1]) * jt;
      var ga = al * INT * alm;
      if (w0 > 0.02) { ctx.globalAlpha = Math.min(1, ga * w0); ctx.drawImage(sprite(HUE[i], 0), x - sz2 / 2, y - sz2 / 2, sz2, sz2); }
      if (w1 > 0.02) { ctx.globalAlpha = Math.min(1, ga * w1); ctx.drawImage(sprite(HUE[i], 1), x - sz2 / 2, y - sz2 / 2, sz2, sz2); }
      if (w2 > 0.02) { ctx.globalAlpha = Math.min(1, ga * w2); ctx.drawImage(sprite(HUE[i], 2), x - sz2 / 2, y - sz2 / 2, sz2, sz2); }
    }
    ctx.globalAlpha = 1;
    drawFloaters(true); // bokeh cercano, por delante
    if (tier === 0) bloom();
    ctx.globalCompositeOperation = "source-over";
  }

  /* --- bucle --- */
  var TS = reduce ? 0.45 : 1; // escala de tiempo: en modo calmo todo va a menos de la mitad de velocidad
  var last = 0, raf = 0, running = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var rawDt = Math.max(0.001, (now - last) / 1000);
    var dt = Math.min(0.05, rawDt);
    last = now;
    t += dt * TS;
    if (reduce || window.__deusStage !== undefined) introT = 99; else introT += dt;
    ema += (Math.min(rawDt, 0.1) - ema) * 0.05;
    if (window.__deusTier !== undefined) { tier = window.__deusTier; low = tier >= 2; } // para pruebas
    else if (tier < 2 && ema > (tier === 0 ? 0.021 : 0.03)) { // el equipo no da: primero sin bloom ni extras, luego versión ligera
      if (++slowFrames > (tier === 0 ? 60 : 90)) { tier++; slowFrames = 0; low = tier >= 2; }
    } else slowFrames = 0;
    window.__deusStat = { tier: tier, frameMs: Math.round(ema * 10000) / 10 };
    render(dt * TS, true, rawDt);
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function boot() {
    document.body.insertBefore(cv, document.body.firstChild);
    resize();
    collect();
    window.addEventListener("resize", function () { resize(); collect(); });
    window.addEventListener("pointermove", function (e) {
      tpx = (e.clientX / Math.max(1, W)) * 2 - 1;
      tpy = (e.clientY / Math.max(1, H)) * 2 - 1;
    }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    window.addEventListener("deus:layout", collect);
    setInterval(collect, 2500); // React y las imágenes cambian la altura de la página
    start();
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
