/* yosoydeus.dev · índice flotante
   Puntos fijos al borde derecho para saltar a cada módulo (proyectos, demos y descargas, skills, experiencia, reel).
   Se ilumina el que estás viendo. Sigue html[lang]. */
(function () {
  "use strict";

  var ITEMS = [
    { id: null, label: { en: "Home", es: "Inicio" } },
    { id: "deus-work", label: { en: "Projects", es: "Proyectos" } },
    { id: "work-unreal", label: { en: "Demos & downloads", es: "Demos y descargas" }, center: true },
    { id: "deus-skills", label: { en: "Skills", es: "Skills" } },
    { id: "deus-exp", label: { en: "Experience", es: "Experiencia" } },
    { id: "deus-reel", label: { en: "Reel & contact", es: "Reel y contacto" } }
  ];

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function absTop(el) { return el.getBoundingClientRect().top + (window.pageYOffset || 0); }

  function build() {
    var nav = document.createElement("nav");
    nav.className = "deus-nav";
    nav.setAttribute("aria-label", "Sections");
    var html = "<ul>";
    ITEMS.forEach(function (it, i) {
      html += '<li><a href="#' + (it.id || "top") + '" data-i="' + i + '"><span class="deus-nav-label font-tech"></span><span class="deus-nav-dot"></span></a></li>';
    });
    nav.innerHTML = html + "</ul>";
    document.body.appendChild(nav);
    return nav;
  }

  function labels(nav) {
    ITEMS.forEach(function (it, i) {
      var a = nav.querySelector('[data-i="' + i + '"]');
      var t = it.label[lang()];
      a.querySelector(".deus-nav-label").textContent = t;
      a.setAttribute("aria-label", t);
    });
  }

  function go(it) {
    var behavior = reduce ? "auto" : "smooth";
    if (!it.id) { window.scrollTo({ top: 0, behavior: behavior }); return; }
    var el = document.getElementById(it.id);
    if (!el) return;
    var top = it.center ? absTop(el) - (window.innerHeight - el.getBoundingClientRect().height) / 2 : absTop(el) - 84;
    window.scrollTo({ top: Math.max(0, top), behavior: behavior });
  }

  function active(nav) {
    var mid = window.innerHeight * 0.45, cur = 0, i;
    // el último módulo cuyo inicio ya pasó la línea de lectura; «demos» solo cuenta si su tarjeta la cruza
    for (i = 0; i < ITEMS.length; i++) {
      var el = ITEMS[i].id ? document.getElementById(ITEMS[i].id) : null;
      if (!ITEMS[i].id) { cur = 0; continue; }
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (ITEMS[i].center) { if (r.top <= mid && r.bottom >= mid) cur = i; }
      else if (r.top <= mid) cur = i;
    }
    // si «demos» no cruza la línea pero estamos dentro de proyectos, queda en proyectos (ya lo da el bucle)
    [].forEach.call(nav.querySelectorAll("a"), function (a) { a.classList.toggle("is-on", +a.getAttribute("data-i") === cur); });
    nav.classList.toggle("is-away", (window.pageYOffset || 0) < window.innerHeight * 0.45); // en el inicio solo hay nombre y constelación: el índice espera
  }

  function boot() {
    var nav = build();
    labels(nav);
    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      go(ITEMS[+a.getAttribute("data-i")]);
      // en móvil no hay «hover»: al tocar un punto se muestra un momento el nombre de la sección
      [].forEach.call(nav.querySelectorAll(".is-flash"), function (x) { x.classList.remove("is-flash"); });
      a.classList.add("is-flash");
      clearTimeout(flashT);
      flashT = setTimeout(function () { a.classList.remove("is-flash"); }, 1500);
    });
    var flashT = 0, idleT = 0;
    function awake() { // en móvil el riel se atenúa cuando no se está moviendo la página
      nav.classList.remove("is-idle");
      clearTimeout(idleT);
      idleT = setTimeout(function () { nav.classList.add("is-idle"); }, 2200);
    }
    window.addEventListener("scroll", awake, { passive: true });
    window.addEventListener("touchstart", awake, { passive: true });
    awake();
    var pending = false;
    function tick() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; active(nav); }); }
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    window.addEventListener("deus:layout", tick);
    setTimeout(tick, 600);
    setInterval(tick, 2000);
    new MutationObserver(function () { labels(nav); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
