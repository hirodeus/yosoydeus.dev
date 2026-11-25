/* yosoydeus.dev · cierre
   Un tramo alto y casi vacío al final de la página: el fondo termina de armar su estructura geométrica, centrada y a la vista
   (deus-genesis.js lee #deus-finale para centrarla y subirla). Abajo, un agradecimiento y una frase al azar sobre IA, futuro y
   tecnología, que se escribe sola; el botón trae otra. Sigue html[lang]. */
(function () {
  "use strict";

  var COPY = {
    eyebrow: { en: "// END_OF_FILE", es: "// FIN_DEL_ARCHIVO" },
    thanks: { en: "Thanks for making it this far", es: "Gracias por llegar hasta aquí" },
    again: { en: "Another message", es: "Otro mensaje" },
    top: { en: "Back to top", es: "Volver arriba" },
    hint: { en: "That shape behind this page started as a single constellation.", es: "La forma que se armó detrás de esta página empezó siendo una constelación." }
  };

  var QUOTES = [
    { en: "The future isn't coming for us. We're building it, one line of code at a time.", es: "El futuro no viene por nosotros. Lo estamos construyendo, línea de código por línea de código." },
    { en: "Machines will learn to think faster. We'll still decide what is worth thinking about.", es: "Las máquinas aprenderán a pensar más rápido. Nosotros seguiremos decidiendo qué vale la pena pensar." },
    { en: "AI doesn't replace imagination. It hands imagination a bigger instrument.", es: "La IA no reemplaza la imaginación: le da un instrumento más grande." },
    { en: "Every tool was once science fiction. Turn today's fiction into tomorrow's tool.", es: "Cada herramienta fue ciencia ficción alguna vez. Convierte la ficción de hoy en la herramienta de mañana." },
    { en: "Technology is just human curiosity with better hardware.", es: "La tecnología es solo curiosidad humana con mejor hardware." },
    { en: "Build things that make people feel the future is worth looking forward to.", es: "Construye cosas que hagan sentir que el futuro vale la pena." },
    { en: "The best interface is the one that disappears and leaves only the experience.", es: "La mejor interfaz es la que desaparece y deja solo la experiencia." },
    { en: "Code is poetry the machine knows how to perform.", es: "El código es poesía que la máquina sabe interpretar." },
    { en: "Between the pixel and the person is where the magic happens. Design for that gap.", es: "Entre el píxel y la persona ocurre la magia. Diseña para ese espacio." },
    { en: "Training a model is teaching a mirror to think. Be careful what you show it.", es: "Entrenar un modelo es enseñarle a pensar a un espejo. Cuida lo que le muestras." },
    { en: "Complexity is just simplicity that never stopped connecting.", es: "Lo complejo es solo lo simple que nunca dejó de conectarse." },
    { en: "Dream in prompts, ship in pixels, and keep the human in the loop.", es: "Sueña en prompts, entrega en píxeles y deja siempre a la persona en el centro." },
    { en: "Great projects start with a conversation. Let's have one.", es: "Los mejores proyectos empiezan con una conversación. Tengamos una." }
  ];

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = -1, timer = 0;
  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function tr(v) { return v[lang()]; }

  function build() {
    var host = document.getElementById("deus-finale");
    if (!host || host.getAttribute("data-built")) return host;
    host.setAttribute("data-built", "1");
    host.innerHTML =
      '<div class="deus-finale-card deus-glass deus-reveal">' +
      '<div class="deus-modules-eyebrow font-tech" data-n="eyebrow"></div>' +
      '<h2 class="deus-finale-title" data-n="thanks"></h2>' +
      '<p class="deus-finale-quote" aria-live="polite"><span data-quote></span><i class="deus-caret" aria-hidden="true"></i></p>' +
      '<div class="deus-finale-actions">' +
      '<button type="button" class="deus-finale-btn" data-again><span aria-hidden="true">↻</span> <span data-n="again"></span></button>' +
      '<button type="button" class="deus-finale-btn is-ghost" data-top><span aria-hidden="true">↑</span> <span data-n="top"></span></button></div>' +
      '<p class="deus-finale-hint font-tech" data-n="hint"></p></div>';
    return host;
  }

  function pick() {
    var n;
    do { n = Math.floor(Math.random() * QUOTES.length); } while (n === cur && QUOTES.length > 1);
    cur = n;
    return n;
  }

  function type(text) {
    var el = document.querySelector("#deus-finale [data-quote]");
    if (!el) return;
    clearInterval(timer);
    if (reduce) { el.textContent = text; return; }
    var i = 0;
    el.textContent = "";
    timer = setInterval(function () {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(timer);
    }, 22);
  }

  function labels() {
    var h = document.getElementById("deus-finale");
    [].forEach.call(h.querySelectorAll("[data-n]"), function (e) { var v = tr(COPY[e.getAttribute("data-n")]); if (e.textContent !== v) e.textContent = v; });
  }

  function show(animate) {
    var text = tr(QUOTES[cur]);
    if (animate) type(text);
    else { clearInterval(timer); var el = document.querySelector("#deus-finale [data-quote]"); if (el) el.textContent = text; }
  }

  function wire() {
    var h = document.getElementById("deus-finale");
    var started = false;
    h.querySelector("[data-again]").addEventListener("click", function () { pick(); show(true); });
    h.querySelector("[data-top]").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    var card = h.querySelector(".deus-reveal");
    function start() { if (started) return; started = true; card.classList.add("is-in"); show(true); }
    // la primera frase se escribe cuando el cierre llega a la pantalla
    if (!("IntersectionObserver" in window) || reduce) { start(); }
    else {
      var io = new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) { start(); io.disconnect(); } }); }, { threshold: 0.2 });
      io.observe(card);
    }
    function check() { if (!started && card.getBoundingClientRect().top < window.innerHeight * 0.95) start(); }
    window.addEventListener("scroll", check, { passive: true });
    setInterval(check, 1200);
  }

  // Después del reel y antes del pie de página.
  function place() {
    var s = document.getElementById("deus-finale");
    if (!s) return false;
    s.setAttribute("data-hue", "175");
    s.setAttribute("data-hue-b", "300");
    return true;
  }

  function boot() {
    if (!build()) return;
    cur = pick();
    labels();
    wire();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var ok = place();
      if (ok) window.dispatchEvent(new Event("deus:layout"));
      if (ok || tries >= 60) clearInterval(iv);
    }, 250);
    new MutationObserver(function () { labels(); show(false); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
