/* yosoydeus.dev · carga diferida propia
   Las imágenes de los módulos llevan data-src (y los videos data-poster): aquí se les da su fuente cuando están a menos de
   ~1100 px de la pantalla. No usa loading="lazy" ni IntersectionObserver: esos no se disparan si la pestaña no está visible
   o si el navegador los aplaza, y las imágenes se quedaban sin cargar. Funciona con scroll, timers y cambios de layout. */
(function () {
  "use strict";
  var MARGIN = 1700;
  var timer = 0;

  function near(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight + MARGIN && r.bottom > -MARGIN;
  }

  function run() {
    var i, el, list = document.querySelectorAll("img[data-src]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (near(el)) { el.src = el.getAttribute("data-src"); el.removeAttribute("data-src"); }
    }
    list = document.querySelectorAll("video[data-poster]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (near(el)) { el.poster = el.getAttribute("data-poster"); el.removeAttribute("data-poster"); }
    }
  }

  function tick() {
    if (timer) return;
    timer = setTimeout(function () { timer = 0; run(); }, 40);
  }

  window.addEventListener("scroll", tick, { passive: true });
  window.addEventListener("resize", tick);
  window.addEventListener("deus:layout", tick);
  window.addEventListener("load", tick);
  document.addEventListener("DOMContentLoaded", tick);
  setInterval(run, 700); // respaldo: el contenido nace por JS y el scroll puede ser programático
  // Calentamiento: pasada la carga, y si la conexión no es ahorradora, se van trayendo las demás imágenes de poco en poco
  // (unas 3 cada 300 ms) para que ya estén listas cuando llegues a ellas.
  function warmUp() {
    var c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    var iv = setInterval(function () {
      var list = document.querySelectorAll("img[data-src]"), n = 0, i;
      for (i = 0; i < list.length && n < 3; i++) { list[i].src = list[i].getAttribute("data-src"); list[i].removeAttribute("data-src"); n++; }
      var vs = document.querySelectorAll("video[data-poster]");
      for (i = 0; i < vs.length && n < 3; i++) { vs[i].poster = vs[i].getAttribute("data-poster"); vs[i].removeAttribute("data-poster"); n++; }
      if (!n) clearInterval(iv);
    }, 300);
  }
  window.addEventListener("load", function () { setTimeout(warmUp, 1800); });
  window.__deusLazyRun = run;
})();
