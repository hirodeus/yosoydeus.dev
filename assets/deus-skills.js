/* yosoydeus.com · CORE_COMPETENCIES.DLL como árbol de habilidades
   Raíz: las tres competencias núcleo del sitio (Unreal Engine | AI/ML | XR). Ramas: las 4 categorías de skills
   originales con TODAS sus skills (el original cortaba la lista a 16 por categoría y escondía Tricaster).
   Pasa el mouse (o toca) un nodo núcleo para encender las skills relacionadas. Sigue html[lang]. */
(function () {
  "use strict";

  var COPY = {
    eyebrow: { en: "// STACK", es: "// STACK" },
    title: "CORE_COMPETENCIES.DLL",
    tagline: { en: "Bridging the gap between a creative vision and technical execution.", es: "Cerrando la brecha entre la visión creativa y la ejecución técnica." },
    hint: { en: "Hover or tap a core node to light up the skills behind it.", es: "Pasa el mouse o toca un nodo núcleo para encender las skills que lo sostienen." },
    skills: { en: "skills", es: "skills" },
    count: { en: "nodes", es: "nodos" }
  };

  var CORE = [
    { id: "unreal", label: { en: "Unreal Engine", es: "Unreal Engine" }, rel: ["Unreal Engine 5", "BluePrints", "C++", "Game development", "Rigging", "VFX"] },
    { id: "ai", label: { en: "AI/ML Integration", es: "Integración IA/ML" }, rel: ["A.I dev.", "Python", "Data Analysis", "Research Skills"] },
    { id: "xr", label: { en: "XR Solutions", es: "Soluciones XR" }, rel: ["XR dev.", "Unreal Engine 5", "Blender", "C4D", "Rigging"] }
  ];

  var BRANCHES = [
    { id: "technical", hue: 195, glyph: "{ }", name: { en: "Technical", es: "Técnico" }, core: ["XR dev.", "A.I dev.", "Unreal Engine 5"],
      items: ["XR dev.", "A.I dev.", "Game development", "Rigging", "Unreal Engine 5", "BluePrints", "C++", "Python", "HTML5", "Data Analysis", "Research Skills"] },
    { id: "creative", hue: 320, glyph: "✦", name: { en: "Creative", es: "Creativo" }, core: [],
      items: ["Creativity", "Graphic Design", "Web development", "Social Media Management", "VFX", "Art Direction", "Concept Art", "Audiovisual Production"] },
    { id: "software", hue: 38, glyph: "▣", name: { en: "Software", es: "Software" }, core: [],
      items: ["Adobe CC", "Ableton live", "Pro tools", "Da vinci", "C4D", "Blender", "Streaming/Broadcast Services", "Figma", "Miro", "Jira", "Slack", "Wordpress", "Shopify", "Webflow.io", "Capcut", "3Play", "Tricaster"] },
    { id: "management", hue: 150, glyph: "◈", name: { en: "Management", es: "Gestión" }, core: [],
      items: ["Project Management", "Communication", "Problem Solving", "Leadership", "Adaptability", "Time Management", "Negotiation Skills", "Sales Skills", "Cold Sales", "CRM", "Software Project Management"] }
  ];

  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function tr(v) { return v && typeof v === "object" ? v[lang()] : v; }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function two(n) { return (n < 10 ? "0" : "") + n; }

  var total = BRANCHES.reduce(function (n, b) { return n + b.items.length; }, 0);

  function build() {
    var host = document.getElementById("deus-skills");
    if (!host || host.getAttribute("data-built")) return host;
    host.setAttribute("data-built", "1");
    var i = 0;
    var html =
      '<div class="deus-skills-head deus-glass">' +
      '<div class="deus-modules-eyebrow font-tech" data-s="eyebrow"></div>' +
      '<h2 class="deus-skills-title">' + COPY.title + "</h2>" +
      '<p class="deus-work-lead" data-s="tagline"></p></div>' +
      '<div class="deus-core" role="group" aria-label="Core">';
    CORE.forEach(function (c, n) {
      html += (n ? '<span class="deus-core-link" aria-hidden="true"></span>' : "") +
        '<button type="button" class="deus-core-node" data-core="' + c.id + '"><span class="deus-core-ring"></span><span data-core-label="' + c.id + '"></span></button>';
    });
    html += '</div><p class="deus-skills-hint font-tech" data-s="hint"></p><div class="deus-tree">';
    BRANCHES.forEach(function (b, n) {
      html += '<section class="deus-branch deus-glass" style="--bh:' + b.hue + '" aria-label="' + esc(b.name.en) + '">' +
        '<header><span class="deus-branch-glyph" aria-hidden="true">' + b.glyph + '</span>' +
        '<h3 class="font-tech"><span class="deus-branch-idx">' + two(n + 1) + "</span> <span data-branch=\"" + b.id + '"></span></h3>' +
        '<span class="deus-branch-count font-tech">' + b.items.length + " <i data-s=\"count\"></i></span></header><ul>";
      b.items.forEach(function (s) {
        var core = b.core.indexOf(s) >= 0;
        html += '<li class="deus-node' + (core ? " is-core" : "") + '" data-skill="' + esc(s) + '" style="--i:' + i++ + '"><span>' + esc(s) + "</span></li>";
      });
      html += "</ul></section>";
    });
    html += "</div>";
    host.innerHTML = html;
    host.setAttribute("data-total", total);
    return host;
  }

  function apply() {
    var h = document.getElementById("deus-skills");
    if (!h) return;
    [].forEach.call(h.querySelectorAll("[data-s]"), function (e) {
      var v = tr(COPY[e.getAttribute("data-s")]);
      if (e.textContent !== v) e.textContent = v;
    });
    CORE.forEach(function (c) { var e = h.querySelector('[data-core-label="' + c.id + '"]'); if (e) e.textContent = tr(c.label); });
    BRANCHES.forEach(function (b) { var e = h.querySelector('[data-branch="' + b.id + '"]'); if (e) e.textContent = tr(b.name); });
  }

  function light(id, on) {
    var h = document.getElementById("deus-skills");
    var core = CORE.filter(function (c) { return c.id === id; })[0];
    [].forEach.call(h.querySelectorAll(".deus-node"), function (n) {
      n.classList.toggle("is-lit", !!on && core.rel.indexOf(n.getAttribute("data-skill")) >= 0);
    });
    h.classList.toggle("is-focus", !!on);
    [].forEach.call(h.querySelectorAll(".deus-core-node"), function (b) { b.classList.toggle("is-on", !!on && b.getAttribute("data-core") === id); });
  }

  function wire() {
    var h = document.getElementById("deus-skills");
    var pinned = null;
    [].forEach.call(h.querySelectorAll(".deus-core-node"), function (b) {
      var id = b.getAttribute("data-core");
      b.addEventListener("mouseenter", function () { if (!pinned) light(id, true); });
      b.addEventListener("mouseleave", function () { if (!pinned) light(id, false); });
      b.addEventListener("focus", function () { if (!pinned) light(id, true); });
      b.addEventListener("blur", function () { if (!pinned) light(id, false); });
      b.addEventListener("click", function () { // en táctil: un toque lo fija, otro lo suelta
        if (pinned === id) { pinned = null; light(id, false); } else { pinned = id; light(id, true); }
      });
    });
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { h.classList.add("is-in"); return; }
    var io = new IntersectionObserver(function (l) {
      l.forEach(function (en) { if (en.isIntersecting || en.boundingClientRect.top < 0) { h.classList.add("is-in"); io.disconnect(); } });
    }, { threshold: 0.08 });
    io.observe(h);
    setTimeout(function () { if (h.getBoundingClientRect().top < window.innerHeight) h.classList.add("is-in"); }, 1500);
    // respaldo por scroll: si el navegador no avisa por el observador, igual aparece al llegar
    var pendingReveal = [h].slice();
    function revealCheck() {
      pendingReveal = pendingReveal.filter(function (e) {
        if (e.classList.contains("is-in")) return false;
        if (e.getBoundingClientRect().top < window.innerHeight * 0.94) { e.classList.add("is-in"); return false; }
        return true;
      });
      if (!pendingReveal.length) { window.removeEventListener("scroll", revealCheck); window.removeEventListener("resize", revealCheck); }
    }
    window.addEventListener("scroll", revealCheck, { passive: true });
    window.addEventListener("resize", revealCheck);
    setInterval(revealCheck, 1200);

  }

  // Justo después de «Selected work» y antes del hub (donde queda solo el panel de experiencia).
  function place() {
    var s = document.getElementById("deus-skills");
    if (!s) return false;
    s.setAttribute("data-hue", "195");
    s.setAttribute("data-hue-b", "290");
    return true;
  }

  function boot() {
    if (!build()) return;
    apply();
    wire();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var ok = place();
      if (ok) window.dispatchEvent(new Event("deus:layout"));
      if (ok || tries >= 60) clearInterval(iv);
    }, 250);
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
