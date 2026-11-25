/* yosoydeus.dev · REEL_2025.WEBM y cierre
   Marco con póster y botón de reproducir (el video de 27 MB solo se descarga al darle clic, y entonces suena),
   el texto de agradecimiento y tres botones de contacto. Reemplaza la sección del reel de React. Sigue html[lang]. */
(function () {
  "use strict";

  var SRC = "/assets/videos/projects/Reel_2025.webm";
  var POSTER = "/assets/exp/poster-reel.webp";

  var COPY = {
    eyebrow: { en: "// FINAL", es: "// FINAL" },
    title: { en: "REEL_2025.WEBM", es: "MENSAJE_FINAL.MP4" },
    desc: {
      en: "Thank you for exploring my work. This reel showcases some of the projects I've had the pleasure of bringing to life. I'm always looking for the next challenge and opportunity to innovate. Let's create something amazing together.",
      es: "Gracias por explorar mi trabajo. Este reel muestra algunos de los proyectos que he tenido el placer de dar vida. Siempre estoy buscando el próximo desafío y la oportunidad de innovar. Creemos algo increíble juntos."
    },
    cap: { en: "Demo reel · play with sound", es: "Demo reel · reproducir con sonido" },
    play: { en: "Play reel", es: "Reproducir reel" },
    talk: { en: "Let's talk", es: "Hablemos" }
  };

  var LINKS = [
    { id: "linkedin", hue: 205, label: "LinkedIn", href: "https://www.linkedin.com/in/h%C3%A9ctor-carrillo-g-b3a362241", ext: true,
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V16M8 7.8v.1M11.5 16v-3.2a2 2 0 014 0V16M11.5 10.5V16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    { id: "mail", hue: 185, label: "Email", href: "mailto:creatividad.integral.mx@gmail.com", ext: false,
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 7.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { id: "wa", hue: 145, label: "WhatsApp", href: "https://wa.me/528131042983?text=Hola%2C%20vi%20tu%20portafolio%20y%20quiero%20saber%20m%C3%A1s%20sobre%20tus%20servicios.", ext: true,
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20l1.2-4A8 8 0 1112 20a8 8 0 01-3.8-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.2c.3 2.6 2.4 4.8 5.6 5.6l1-1.2-1.8-1-.9.6c-.9-.4-1.6-1.1-2-2l.6-.9-1-1.8z" fill="currentColor"/></svg>' }
  ];

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function tr(v) { return v[lang()]; }

  function build() {
    var host = document.getElementById("deus-reel");
    if (!host || host.getAttribute("data-built")) return host;
    host.setAttribute("data-built", "1");
    var cta = "";
    LINKS.forEach(function (l) {
      cta += '<a class="deus-reel-btn" style="--ac:' + l.hue + '" href="' + l.href + '"' + (l.ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + l.icon + "<span>" + l.label + "</span></a>";
    });
    host.innerHTML =
      '<div class="deus-reel-head deus-glass deus-reveal">' +
      '<div class="deus-modules-eyebrow font-tech" data-r="eyebrow"></div>' +
      '<h2 class="deus-skills-title" data-r="title"></h2>' +
      '<p class="deus-work-lead" data-r="desc"></p></div>' +
      '<div class="deus-reel-frame deus-reveal"><div class="deus-reel-screen" data-screen>' +
      '<img data-src="' + POSTER + '" alt="" width="1280" height="720" decoding="async" />' +
      '<button type="button" class="deus-reel-play" data-play><span class="deus-reel-ring"></span><span class="deus-reel-ring r2"></span><i aria-hidden="true"></i></button>' +
      '<span class="deus-reel-cap font-tech" data-r="cap"></span></div></div>' +
      '<div class="deus-reel-cta deus-reveal"><span class="deus-reel-talk font-tech" data-r="talk"></span>' + cta + "</div>";
    return host;
  }

  function apply() {
    var h = document.getElementById("deus-reel");
    if (!h) return;
    [].forEach.call(h.querySelectorAll("[data-r]"), function (e) { var v = tr(COPY[e.getAttribute("data-r")]); if (e.textContent !== v) e.textContent = v; });
    var b = h.querySelector("[data-play]");
    if (b) b.setAttribute("aria-label", tr(COPY.play));
    var im = h.querySelector("img");
    if (im) im.alt = tr(COPY.title) + " — " + tr(COPY.cap);
  }

  function wire() {
    var h = document.getElementById("deus-reel");
    var screen = h.querySelector("[data-screen]");
    h.querySelector("[data-play]").addEventListener("click", function () {
      var v = document.createElement("video");
      v.src = SRC;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.loop = true;
      v.volume = 0.6;
      v.setAttribute("aria-label", tr(COPY.title));
      screen.innerHTML = "";
      screen.classList.add("is-video");
      screen.appendChild(v);
      var p = v.play();
      if (p && p.catch) p.catch(function () {}); // si el navegador no deja arrancar solo, quedan los controles
    });
    var items = [].slice.call(h.querySelectorAll(".deus-reveal"));
    if (reduce || !("IntersectionObserver" in window)) { items.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (l) {
      l.forEach(function (en) { if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (e) { io.observe(e); });
    setTimeout(function () { items.forEach(function (e) { if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add("is-in"); }); }, 1500);
    // respaldo por scroll: si el navegador no avisa por el observador, igual aparece al llegar
    var pendingReveal = items.slice();
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

  // Justo antes del reel original (que queda oculto) y después de la experiencia.
  function place() {
    var s = document.getElementById("deus-reel");
    if (!s) return false;
    s.setAttribute("data-hue", "185");
    s.setAttribute("data-hue-b", "330");
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
