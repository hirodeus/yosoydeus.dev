/* yosoydeus.dev · WORK_EXPERIENCE.EXE como línea de tiempo
   - Arriba, una tira de carrera (2019 → hoy) con un carril por empresa (y una barra por rol si hubo ascenso): se ve de un vistazo cuándo y cuánto tiempo.
   - Debajo, una tarjeta por rol con todo abierto (sin clics): periodo, ubicación, logros, tags y su material (video o fotos).
   Cada video muestra un póster y solo se descarga al pasar el mouse (o al tocar).
   Reemplaza el panel desplegable de React. Sigue html[lang]. */
(function () {
  "use strict";

  var V = "/assets/videos/projects/";
  var X = "/assets/exp/";

  var JOBS = [
    {
      id: "extein", company: "EXTEIN", hue: 175, from: [2024, 6], to: null,
      location: { en: "Monterrey, N.L., México", es: "Monterrey, N.L., México" },
      roles: [
        { title: { en: "Technology Innovation Director", es: "Director de Innovación Tecnológica" }, from: [2026, 1], to: null, short: { en: "DIRECTOR", es: "DIRECTOR" } },
        { title: { en: "Creative Developer", es: "Desarrollador Creativo" }, from: [2024, 6], to: [2025, 12], short: { en: "EXTEIN · DEV", es: "EXTEIN · DEV" } }
      ],
      bullets: {
        en: ["Development of integrated systems and technology services.", "In charge of solutions and follow-up for the client portfolio; currently leading research and development of AI-powered tools.", "Customer relationship management, creative concept design and applied creativity."],
        es: ["Desarrollo de sistemas integrales y servicios de tecnología.", "Encargado de dar solución y seguimiento a la cartera de clientes; actualmente a cargo de la investigación y el desarrollo de herramientas con inteligencia artificial.", "Gestión de relaciones con clientes, diseño de conceptos creativos y creatividad aplicada."]
      },
      tags: ["AI Tools", "R&D", "Integrated Systems", "Client Management", "Creative Concepts", "Applied Creativity"],
      images: ["extein-1"]
    },
    {
      id: "bedu", company: "BEDU", hue: 255, from: [2025, 2], to: [2026, 6],
      location: { en: "Monterrey, N.L., México · remote", es: "Monterrey, N.L., México · remoto" },
      role: { en: "Course Instructor", es: "Instructor de cursos" },
      bullets: {
        en: ["Instructor of video game programming courses.", "Generative AI teacher.", "3D and Unreal Engine courses.", "Instructional design and webinar tutor."],
        es: ["Instructor de cursos de programación de videojuegos.", "Maestro de IA generativa.", "Cursos de 3D y Unreal Engine.", "Diseño instruccional y tutor de webinars."]
      },
      tags: ["Game Programming", "Generative AI", "Unreal Engine", "3D", "Instructional Design", "Webinars"],
      images: ["bedu-1"]
    },
    {
      id: "tec", company: "TECNOLÓGICO DE MONTERREY", abbr: "TEC DE MONTERREY", hue: 55, from: [2023, 9], to: [2024, 11],
      location: { en: "Monterrey, N.L., México · hybrid", es: "Monterrey, N.L., México · híbrido" },
      role: { en: "Titular Professor · part-time", es: "Catedrático Titular · medio tiempo" },
      bullets: {
        en: ["Taught Visual Effects, 3D Rendering, Physics Simulation, Blueprints in Unreal Engine, Blender, Houdini and the Niagara system.", "Courses covering 3D modeling, film production, 3D visualization, 3D prototyping and 3D modeling software."],
        es: ["Impartí Visual Effects, Render 3D, Simulación física, Blueprints en Unreal Engine, Blender, Houdini y sistema Niagara.", "Cursos de modelado 3D, producción cinematográfica, visualización 3D, prototipado 3D y software de modelado 3D."]
      },
      tags: ["Visual Effects", "3D Rendering", "Physics Simulation", "Unreal Blueprints", "Blender", "Houdini", "Niagara", "3D Modeling", "Film Production", "3D Visualization", "3D Prototyping"],
      images: ["tec-1"]
    },
    {
      id: "drip", company: "DRIP", hue: 285, from: [2022, 9], to: [2024, 10],
      location: { en: "Dubai, United Arab Emirates", es: "Dubái, Emiratos Árabes Unidos" },
      role: { en: "VFX Supervisor / Art Director / Blockchain Expert", es: "Supervisor de VFX / Director de Arte / Experto en Blockchain" },
      bullets: {
        en: ["Utilized Unreal Engine 5 to develop the early stage of an upcoming Blockchain AAA MMO Game.", "Enhanced character design process, conceptual design and implementation of 3D game-ready models.", "Delivered a Teaser Trailer from script to cinematic animation using actual game models."],
        es: ["Utilicé Unreal Engine 5 para desarrollar la etapa inicial de un próximo juego MMO AAA en Blockchain.", "Mejoré el proceso de diseño de personajes, el diseño conceptual y la implementación de modelos 3D listos para el juego.", "Entregué un Teaser Trailer, desde el guion hasta la animación cinematográfica usando modelos reales del juego."]
      },
      tags: ["Unreal Engine 5", "VFX", "Art Direction", "Blockchain", "MMO"],
      videos: [{ src: V + "DRIP.webm", poster: "poster-drip", cap: { en: "Teaser Trailer", es: "Teaser Trailer" } }]
    },
    {
      id: "sumeru", company: "SUMERU", hue: 195, from: [2022, 10], to: [2024, 3],
      location: { en: "Los Angeles, CA, U.S.A", es: "Los Ángeles, CA, EE. UU." },
      role: { en: "UE 5 Technical Manager / XR specialist", es: "Gerente Técnico de UE 5 / Especialista en XR" },
      bullets: {
        en: ["Developed a pipeline to facilitate Augmented/Virtual Reality solutions for Mining and Oil industries.", "Provider of MetaVerse and VR experiences based on Unreal Engine.", "Developed guided tours for the Real Estate Sector with variant control and real-time lighting."],
        es: ["Desarrollé un pipeline para facilitar soluciones de Realidad Aumentada/Virtual para las industrias de Minería y Petróleo.", "Proveedor de experiencias de MetaVerso y VR basadas en Unreal Engine.", "Desarrollé recorridos guiados para el Sector Inmobiliario con control de variantes e iluminación en tiempo real."]
      },
      tags: ["Unreal Engine 5", "XR", "AR/VR", "MetaVerse", "Blueprints"],
      videos: [{ src: V + "SUMERU.webm", poster: "poster-sumeru", cap: { en: "XR / real-time work", es: "Trabajo XR / tiempo real" } }]
    },
    {
      id: "bm360", company: "BM 360", hue: 150, from: [2021, 9], to: [2024, 10],
      location: { en: "Monterrey, N.L., México", es: "Monterrey, N.L., México" },
      role: { en: "Commercial Director / Media Editor", es: "Director Comercial / Editor de Medios" },
      bullets: {
        en: ["Responsible for audiovisual media production and project definition with clients.", "Developed communication strategies and multimedia content, specializing in 3D, AR, and VR.", "Instructional Designer for the UN Women course 'Gender Perspective for Public Servants.'"],
        es: ["Responsable de la producción de medios audiovisuales y definición de proyectos con clientes.", "Desarrollé estrategias de comunicación y contenido multimedia, especializándome en 3D, RA y RV.", "Diseñador Instruccional para el curso de ONU Mujeres 'Perspectiva de Género para Servidores Públicos'."]
      },
      tags: ["Project Management", "Media Production", "3D", "AR/VR", "Instructional Design"],
      images: ["bm360-1", "bm360-2", "bm360-3", "bm360-4"]
    },
    {
      id: "d111", company: "D111 Films", hue: 28, from: [2019, 8], to: [2024, 7],
      location: { en: "Monterrey, N.L., México", es: "Monterrey, N.L., México" },
      role: { en: "Director / Lead Actor", es: "Director / Actor Principal" },
      bullets: {
        en: ["Led a film crew, supervised audiovisual production components, scripts, and post-production processes.", "Collaborated with actors, writers and department heads for results, resource management, and production and design strategy evaluation."],
        es: ["Lideré un equipo de filmación, supervisé componentes de producción audiovisual, guiones y procesos de postproducción.", "Colaboré con actores, escritores y jefes de departamento para la gestión de recursos y evaluación de estrategias de producción."]
      },
      tags: ["Directing", "Film Production", "Acting", "Scriptwriting", "Post-production"],
      videos: [
        { src: V + "D111.webm", poster: "poster-d111", cap: { en: "D111 Showreel 1", es: "D111 Showreel 1" } },
        { src: V + "D111-2.webm", poster: "poster-d111-2", cap: { en: "D111 Showreel 2", es: "D111 Showreel 2" } }
      ]
    },
    {
      id: "ace", company: "LIGA ACE ESPORTS", hue: 340, from: [2025, 1], to: [2025, 11],
      location: { en: "Monterrey, N.L., México", es: "Monterrey, N.L., México" },
      role: { en: "Real-time video clip management for Esports", es: "Gestión de videoclips en tiempo real para Esports" },
      stat: { en: "−20% export time", es: "−20% tiempo de exportación" },
      bullets: {
        en: ["Managed real-time video clip selection, editing, and delivery for eSports broadcasts.", "Coordinated with observers to ensure high-quality replay captures during live tournaments.", "Optimized export workflow, reducing processing time by 20%.", "Developed a structured tagging system to enhance clip identification and retrieval."],
        es: ["Gestioné la selección, edición y entrega de videoclips en tiempo real para transmisiones de eSports.", "Coordiné con observadores para asegurar capturas de repeticiones de alta calidad durante torneos en vivo.", "Optimicé el flujo de trabajo de exportación, reduciendo el tiempo de procesamiento en un 20%.", "Desarrollé un sistema de etiquetado estructurado para mejorar la identificación y recuperación de clips."]
      },
      tags: ["Esports", "Live Production", "Video Editing", "Broadcast", "Workflow Optimization"],
      images: ["ace-1", "ace-2"]
    }
  ];

  var COPY = {
    eyebrow: { en: "// LOG", es: "// LOG" },
    title: "WORK_EXPERIENCE.EXE",
    lead: { en: "Roles, collaborations and context for how I solve problems with teams.", es: "Roles, colaboraciones y contexto de cómo resuelvo problemas con equipos." },
    strip: { en: "Career at a glance", es: "Trayectoria de un vistazo" },
    expand: { en: "Fullscreen", es: "Pantalla completa" },
    now: { en: "Present", es: "Actualidad" }
  };

  var NOWD = new Date(), NOWY = NOWD.getFullYear(), NOWM = NOWD.getMonth() + 1;
  var AXIS_FROM = 2019, AXIS_TO = Math.max(2027, NOWY + 1);
  function end(j) { return j.to || [NOWY, NOWM]; } // to: null = sigue vigente
  // más reciente primero: por fin (lo vigente arriba) y, a igual fin, por inicio
  JOBS.sort(function (a, b) {
    var ea = end(a)[0] * 12 + end(a)[1], eb = end(b)[0] * 12 + end(b)[1];
    return eb - ea || (b.from[0] * 12 + b.from[1]) - (a.from[0] * 12 + a.from[1]);
  });
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function tr(v) { return v && typeof v === "object" && !Array.isArray(v) ? v[lang()] : v; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function months(j) { return (end(j)[0] * 12 + end(j)[1]) - (j.from[0] * 12 + j.from[1]) + 1; }
  function fmt(d) { return pad(d[1]) + "/" + d[0]; }
  function duration(m) {
    var y = Math.floor(m / 12), r = m % 12, es = lang() === "es", out = [];
    if (y) out.push(y + (es ? (y === 1 ? " año" : " años") : (y === 1 ? " yr" : " yrs")));
    if (r) out.push(r + (es ? (r === 1 ? " mes" : " meses") : (r === 1 ? " mo" : " mos")));
    return out.join(" ");
  }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function pos(y, m) { return y + (m - 1) / 12; }

  function build() {
    var host = document.getElementById("deus-exp");
    if (!host || host.getAttribute("data-built")) return host;
    host.setAttribute("data-built", "1");
    var html =
      '<div class="deus-x-head deus-glass">' +
      '<div class="deus-modules-eyebrow font-tech" data-x="eyebrow"></div>' +
      '<h2 class="deus-skills-title">' + COPY.title + "</h2>" +
      '<p class="deus-work-lead" data-x="lead"></p></div>';

    // tira de carrera
    var order = JOBS.slice().sort(function (a, b) { return pos(a.from[0], a.from[1]) - pos(b.from[0], b.from[1]); });
    html += '<div class="deus-strip deus-glass" role="img" aria-label="Career timeline"><div class="deus-strip-title font-tech" data-x="strip"></div><div class="deus-strip-plot" style="--yrs:' + (AXIS_TO - AXIS_FROM) + ';height:' + (JOBS.length * 1.95 + 0.9).toFixed(2) + 'rem">';
    var span = AXIS_TO - AXIS_FROM, y;
    for (y = AXIS_FROM; y <= AXIS_TO; y++) html += '<span class="deus-tick font-tech" style="left:' + ((y - AXIS_FROM) / span * 100) + '%"><i>' + y + "</i></span>";
    var LANE = 1.95;
    order.forEach(function (j, lane) {
      var segs = j.roles ? j.roles.map(function (r) { return { from: r.from, to: r.to || [NOWY, NOWM], label: r.short, role: true }; }) : [{ from: j.from, to: end(j), label: j.abbr || j.company }];
      segs.forEach(function (sg) {
        var s0 = pos(sg.from[0], sg.from[1]), e0 = pos(sg.to[0], sg.to[1]) + 1 / 12;
        var left = (s0 - AXIS_FROM) / span * 100, width = Math.max(1.3, (e0 - s0) / span * 100);
        var label = typeof sg.label === "object" ? sg.label.en : sg.label; // nombres propios: no cambian con el idioma
        html += '<button type="button" class="deus-bar' + (width < 9 && !sg.role ? " is-short" : "") + '" data-job="' + j.id + '" style="--ac:' + j.hue + ";top:" + (lane * LANE + 0.3).toFixed(2) + "rem;left:" + left + "%;width:" + width + '%"><span class="font-tech">' + esc(label) + "</span></button>";
      });
    });
    html += "</div></div>";

    // tarjetas
    html += '<div class="deus-x-list">';
    JOBS.forEach(function (j, n) {
      html += '<article class="deus-x-card deus-glass" id="exp-' + j.id + '" data-job="' + j.id + '" style="--ac:' + j.hue + ";--bh:" + j.hue + '" data-hue="' + j.hue + '" data-hue-b="' + (j.hue + 70) + '">' +
        '<div class="deus-x-body">' +
        '<div class="deus-x-period font-tech"><span data-f="period"></span><b data-f="dur"></b></div>' +
        '<h3 class="deus-x-company">' + esc(j.company) + "</h3>" +
        (j.roles ? '<ul class="deus-x-roles">' + j.roles.map(function (r, i) { return '<li><b data-rt="' + i + '"></b><span class="font-tech" data-rp="' + i + '"></span></li>'; }).join("") + "</ul>" : '<p class="deus-x-role" data-f="role"></p>') +
        '<p class="deus-x-loc font-tech"><span aria-hidden="true">⌖</span> <span data-f="loc"></span></p>' +
        '<ul class="deus-x-bullets" data-f="bullets"></ul>' +
        (j.stat ? '<div class="deus-x-stat font-tech" data-f="stat"></div>' : "") +
        '<div class="deus-ui-tags" data-f="tags"></div></div>' +
        '<div class="deus-x-media' + (j.videos && j.videos.length > 1 ? " is-pair" : "") + '">' + mediaHtml(j) + "</div></article>";
    });
    html += "</div>";
    host.innerHTML = html;
    return host;
  }

  function mediaHtml(j) {
    var h = "";
    if (j.videos) {
      j.videos.forEach(function (v, i) {
        h += '<div class="deus-vid" data-vid="' + i + '"><video muted loop playsinline preload="none" data-poster="' + X + v.poster + '.webp" data-src="' + v.src + '"></video>' +
          '<span class="deus-vid-play" aria-hidden="true"></span><span class="deus-vid-cap font-tech" data-vcap="' + i + '"></span>' +
          '<button type="button" class="deus-vid-fs" data-fs aria-label="Fullscreen">⛶</button></div>';
      });
    } else if (j.images) {
      h += '<div class="deus-x-stage"><img data-main data-src="' + X + j.images[0] + '.webp" alt="" width="960" height="600" decoding="async" /></div>';
      if (j.images.length > 1) {
        h += '<div class="deus-ui-thumbs" style="--n:' + j.images.length + '">';
        j.images.forEach(function (n, i) {
          h += '<button type="button" class="deus-ui-thumb' + (i === 0 ? " is-on" : "") + '" data-i="' + i + '"><img data-src="' + X + "t/" + n + '.webp" alt="" width="320" height="200" decoding="async" /></button>';
        });
        h += "</div>";
      }
    }
    return h;
  }

  function apply() {
    var h = document.getElementById("deus-exp");
    if (!h) return;
    [].forEach.call(h.querySelectorAll("[data-x]"), function (e) { var v = tr(COPY[e.getAttribute("data-x")]); if (e.textContent !== v) e.textContent = v; });
    JOBS.forEach(function (j) {
      var el = document.getElementById("exp-" + j.id);
      if (!el) return;
      var set = function (k, v) { var t = el.querySelector('[data-f="' + k + '"]'); if (t && t.textContent !== v) t.textContent = v; };
      set("period", fmt(j.from) + (j.to && j.from[0] === j.to[0] && j.from[1] === j.to[1] ? "" : " → " + (j.to ? fmt(j.to) : tr(COPY.now))));
      set("dur", " · " + duration(months(j)));
      if (j.role) set("role", tr(j.role));
      if (j.roles) j.roles.forEach(function (r, i) {
        var t = el.querySelector('[data-rt="' + i + '"]'), pp = el.querySelector('[data-rp="' + i + '"]');
        if (t) t.textContent = tr(r.title);
        if (pp) pp.textContent = fmt(r.from) + " → " + (r.to ? fmt(r.to) : tr(COPY.now));
      });
      set("loc", tr(j.location));
      if (j.stat) set("stat", tr(j.stat));
      var ul = el.querySelector('[data-f="bullets"]'), bl = j.bullets[lang()], sig = bl.join("|");
      if (ul.getAttribute("data-sig") !== sig) {
        ul.setAttribute("data-sig", sig);
        ul.innerHTML = "";
        bl.forEach(function (b) { var li = document.createElement("li"); li.textContent = b; ul.appendChild(li); });
      }
      var tg = el.querySelector('[data-f="tags"]');
      if (!tg.childNodes.length) j.tags.forEach(function (t) { var d = document.createElement("div"); d.className = "deus-ui-tag font-tech"; d.textContent = t; tg.appendChild(d); });
      if (j.videos) j.videos.forEach(function (v, i) { var c = el.querySelector('[data-vcap="' + i + '"]'); if (c) c.textContent = tr(v.cap); });
      var fs = el.querySelectorAll("[data-fs]");
      [].forEach.call(fs, function (b) { b.setAttribute("aria-label", tr(COPY.expand)); });
    });
  }

  function wireVideos() {
    var tiles = [].slice.call(document.querySelectorAll("#deus-exp .deus-vid"));
    function load(tile) { // el video se descarga solo al pasar el mouse / tocar; antes se ve el póster
      var v = tile.querySelector("video");
      if (v.getAttribute("src")) return v;
      v.preload = "auto";
      v.src = v.getAttribute("data-src");
      return v;
    }
    function play(tile) { var v = load(tile); tile.classList.add("is-playing"); var p = v.play(); if (p && p.catch) p.catch(function () { tile.classList.remove("is-playing"); }); }
    function pause(tile) { var v = tile.querySelector("video"); if (v.getAttribute("src")) v.pause(); tile.classList.remove("is-playing"); }
    tiles.forEach(function (tile) {
      tile.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") play(tile); });
      tile.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") pause(tile); });
      tile.addEventListener("click", function (e) {
        if (e.target.closest("[data-fs]")) return;
        if (tile.classList.contains("is-playing")) pause(tile); else play(tile);
      });
      tile.querySelector("[data-fs]").addEventListener("click", function () {
        var v = load(tile);
        var inFs = document.fullscreenElement;
        if (inFs) { document.exitFullscreen(); return; }
        v.controls = true;
        v.play().catch(function () {});
        tile.classList.add("is-playing");
        (tile.requestFullscreen || tile.webkitRequestFullscreen || function () { return Promise.resolve(); }).call(tile);
      });
    });
    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement) tiles.forEach(function (t) { t.querySelector("video").controls = false; });
    });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting && en.target.classList.contains("is-playing") && !document.fullscreenElement) pause(en.target);
      });
    });
    tiles.forEach(function (t) { io.observe(t); });
  }

  function wire() {
    var h = document.getElementById("deus-exp");
    // tira ↔ tarjetas
    function hot(id, on) {
      [].forEach.call(h.querySelectorAll('[data-job="' + id + '"]'), function (e) { e.classList.toggle("is-hot", on); });
    }
    [].forEach.call(h.querySelectorAll(".deus-bar"), function (b) {
      var id = b.getAttribute("data-job");
      b.addEventListener("mouseenter", function () { hot(id, true); });
      b.addEventListener("mouseleave", function () { hot(id, false); });
      b.addEventListener("focus", function () { hot(id, true); });
      b.addEventListener("blur", function () { hot(id, false); });
      b.addEventListener("click", function () { document.getElementById("exp-" + id).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); });
    });
    [].forEach.call(h.querySelectorAll(".deus-x-card"), function (c) {
      var id = c.getAttribute("data-job");
      c.addEventListener("mouseenter", function () { hot(id, true); });
      c.addEventListener("mouseleave", function () { hot(id, false); });
      // fotos
      var main = c.querySelector("img[data-main]");
      if (main) {
        var job = JOBS.filter(function (j) { return j.id === id; })[0];
        [].forEach.call(c.querySelectorAll(".deus-ui-thumb"), function (b) {
          b.addEventListener("click", function () {
            var i = +b.getAttribute("data-i");
            [].forEach.call(c.querySelectorAll(".deus-ui-thumb"), function (o) { o.classList.toggle("is-on", o === b); });
            main.removeAttribute("data-src");
            main.classList.add("is-swapping");
            var nx = new Image();
            nx.onload = function () { main.src = X + job.images[i] + ".webp"; requestAnimationFrame(function () { main.classList.remove("is-swapping"); }); };
            nx.onerror = function () { main.classList.remove("is-swapping"); };
            nx.src = X + job.images[i] + ".webp";
          });
        });
      }
    });
    wireVideos();
    // entrada
    var items = [].slice.call(h.querySelectorAll(".deus-x-card, .deus-strip, .deus-x-head"));
    if (reduce || !("IntersectionObserver" in window)) { items.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (l) {
      l.forEach(function (en) { if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
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

  // Justo antes del reel (el hub y el panel de React quedan ocultos).
  function place() {
    return !!document.getElementById("deus-exp");
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
