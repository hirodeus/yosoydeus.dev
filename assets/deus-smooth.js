/* yosoydeus.dev · scroll de rueda con muescas, suavizado y con aceleración
   Una rueda de mouse manda «clics» de 100 px y la página se mueve a saltos y se frena entre uno y otro. Aquí:
     1. cada muesca solo mueve un DESTINO; la página lo alcanza deslizándose (curva suave, independiente de los fps);
     2. se mide el RITMO de las muescas: un clic suelto avanza lo normal, pero si giras rápido el recorrido se acelera
        (hasta ~3x) para que la página te siga sin quedarse atrás;
     3. entre muesca y muesca no hay pausa: el destino siempre va por delante, así que el movimiento es continuo;
     4. si cambias de dirección, el recorrido pendiente se cancela y responde al instante.
   No se mete con: trackpad / touch (ya tienen su inercia), teclado, barra de scroll, zoom con ctrl, pantalla completa, visor 3D
   ni videos con controles. Se apaga si el sistema pide reducir el movimiento.
   Ajustes: BASE (px por clic), EASE (menor = más largo el deslizamiento), ACCEL_MAX (tope de aceleración). */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (reduce || coarse || window.__deusSmooth) return;
  window.__deusSmooth = true;

  var BASE = 1.1;       // multiplicador del clic base (100 px -> 110 px)
  var EASE = 0.105;     // fracción de la distancia que recorre en cada 1/60 s
  var ACCEL_MAX = 3.2;  // tope de aceleración con giro muy rápido
  var RATE_FREE = 3;    // clics/s hasta los que no hay aceleración
  var RATE_GAIN = 0.11; // cuánto acelera por cada clic/s de más
  var MAX_LEAD = 2.4;   // el destino no se adelanta más de 2.4 pantallas

  var cur = window.pageYOffset, target = cur, active = false, raf = 0, last = 0;
  var lastWheel = 0, rate = 1;
  var stat = (window.__deusSmoothStat = { mouse: 0, passed: 0, accel: 1 });

  function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function clamp(v) { return Math.max(0, Math.min(maxScroll(), v)); }

  function loop(now) {
    var dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
    last = now;
    var k = 1 - Math.pow(1 - EASE, dt * 60); // independiente de los fps
    cur += (target - cur) * k;
    if (Math.abs(target - cur) < 0.4) { cur = target; active = false; }
    window.scrollTo(0, cur);
    if (active) raf = requestAnimationFrame(loop);
  }

  // ¿rueda de mouse con muescas (sí) o trackpad (no)?
  function isNotchWheel(e) {
    if (e.deltaMode !== 0) return true; // Firefox y otros: líneas/páginas
    var w = e.wheelDeltaY;
    return !!w && Math.abs(w) % 120 === 0 && Math.abs(e.deltaY) >= 50; // clics de 100 px = 120 «ticks»; el trackpad manda valores finos
  }

  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey || e.defaultPrevented || document.fullscreenElement) return; // zoom y pantalla completa: nativo
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // scroll horizontal
    var el = e.target;
    if (el && el.closest && el.closest("model-viewer, video[controls], textarea, select, [data-no-smooth]")) return;
    for (var n = el; n && n !== document.body && n.nodeType === 1; n = n.parentNode) { // contenedor con scroll propio: déjalo
      var st = window.getComputedStyle(n);
      if ((st.overflowY === "auto" || st.overflowY === "scroll") && n.scrollHeight > n.clientHeight + 2) return;
    }
    if (!isNotchWheel(e)) { stat.passed++; return; } // trackpad: scroll nativo con su inercia

    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 34;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (!dy) return;
    e.preventDefault();
    stat.mouse++;

    var now = performance.now(), gap = now - lastWheel;
    lastWheel = now;
    // ritmo de clics por segundo (suavizado); tras una pausa vuelve a empezar
    rate = gap > 380 ? 1 : rate * 0.45 + (1000 / Math.max(gap, 8)) * 0.55;
    var accel = 1 + Math.min(ACCEL_MAX - 1, Math.max(0, (rate - RATE_FREE) * RATE_GAIN));
    stat.accel = accel;

    if (!active) { cur = window.pageYOffset; target = cur; }
    var dir = dy > 0 ? 1 : -1;
    // cambio de dirección: se cancela lo que faltaba por recorrer
    if (active && (target - cur) * dir < -20) target = cur;
    var step = dir * Math.min(Math.abs(dy), 160) * BASE * accel;
    target = clamp(target + step);
    var lead = window.innerHeight * MAX_LEAD;
    if (target - cur > lead) target = clamp(cur + lead);
    else if (cur - target > lead) target = clamp(cur - lead);
    if (!active) { active = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { passive: false });

  // Si el scroll lo mueve otra cosa (teclado, barra, índice, anclas), se sincroniza y no pelea.
  window.addEventListener("scroll", function () {
    var y = window.pageYOffset;
    if (!active) { cur = target = y; return; }
    if (Math.abs(y - cur) > 3) { active = false; cancelAnimationFrame(raf); cur = target = y; }
  }, { passive: true });
  window.addEventListener("resize", function () { target = clamp(target); });
})();
