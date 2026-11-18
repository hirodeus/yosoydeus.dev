/* yosoydeus.com · «Selected work»
   Todos los proyectos con enlace en el mismo formato de tarjeta: texto a un lado y, al otro, una galería que se
   recorre con miniaturas (sin abrir paneles). Sustituye el hub de 3 tarjetas, la franja de Webs y el panel
   PROJECTS.INIT, que repetían esta misma información. Sigue el idioma del sitio (html[lang]). */
(function () {
  "use strict";

  var S = "/assets/ui/";
  var K = "/assets/work/";

  var CARDS = [
    {
      id: "sombra",
      hue: [175, 320],
      eyebrow: { en: "GAME UI / INTERFACE DESIGN", es: "UI DE JUEGO / DISEÑO DE INTERFAZ" },
      title: { en: "Juego de Sombra UI showcase", es: "Juego de Sombra: muestra de UI" },
      body: {
        en: "A game interface designed and built from scratch: title screen, pilot select, a HUD with dock navigation, attribute radar, skill tree, missions and pause menu, built around a generative particle instrument where chains of particles play melodies and the field changes with depth. Playable in the browser, on laptop and phone.",
        es: "Una interfaz de juego diseñada y construida desde cero: pantalla de título, selección de piloto, HUD con navegación en dock, radar de atributos, árbol de habilidades, misiones y menú de pausa, alrededor de un instrumento generativo de partículas donde las cadenas tocan melodías y el campo cambia con la profundidad. Se juega en el navegador, en laptop y celular."
      },
      lead: {
        en: "An interactive journey of self-discovery. Confront your shadow in this gamified psychological experience.",
        es: "Un viaje interactivo de autodescubrimiento. Enfrenta tu sombra en esta experiencia psicológica gamificada."
      },
      tags: ["REACT", "TAILWIND", "D3.JS", "WEB AUDIO"],
      link: "https://juegodesombra.yosoydeus.com",
      label: { en: "Play the game", es: "Jugar" },
      note: "juegodesombra.yosoydeus.com",
      head: "UI_SCREENS.PNG",
      shots: [
        { src: S + "hud.webp", cap: { en: "HUD and dock", es: "HUD y dock" } },
        { src: S + "depth.webp", cap: { en: "Depth 3: melody bridge and a devourer", es: "Profundidad 3: puente de melodía y un devorador" } },
        { src: S + "skills.webp", cap: { en: "Skill tree", es: "Árbol de habilidades" } },
        { src: S + "attributes.webp", cap: { en: "Attribute radar", es: "Radar de atributos" } },
        { src: S + "pause.webp", cap: { en: "Pause and settings", es: "Pausa y ajustes" } }
      ]
    },
    {
      id: "unreal",
      hue: [28, 205],
      flip: true,
      eyebrow: { en: "UNREAL ENGINE / REAL-TIME", es: "UNREAL ENGINE / TIEMPO REAL" },
      note: { en: "Downloads from Google Drive", es: "Descarga desde Google Drive" },
      head: "UE_DEMOS.EXE",
      shots: [
        {
          src: K + "bm-house.webp",
          cap: { en: "BM 360 Interactive House", es: "Casa Interactiva BM 360" },
          title: { en: "BM 360 Interactive House", es: "Casa Interactiva BM 360" },
          body: { en: "An interactive exterior/interior space, technical demo, showroom interactive house.", es: "Un espacio interactivo exterior/interior, demo técnica y showroom de casa interactiva." },
          tags: ["UNREAL ENGINE", "INTERACTIVE DEMO", "ARCHVIZ"],
          link: "https://drive.google.com/file/d/1zuqn17DRNpz4QBjRsO1z0ITdfX2HkYJ3/view?usp=sharing",
          label: { en: "BM HOUSE DEMO (1.70GB)", es: "DEMO BM HOUSE (1.70GB)" }
        },
        {
          src: K + "vespa.webp",
          cap: { en: "Vespa model variation", es: "Variación de modelo Vespa" },
          title: { en: "Vespa Model Variation Demo", es: "Demo de Variación de Modelo Vespa" },
          body: { en: "A model visualizer with color and pieces variant, using Unreal tools to manage variations, you can see the function programmed on any of these two examples, all made in UE5.", es: "Un visualizador de modelos con variantes de color y piezas, usando herramientas de Unreal para gestionar variaciones, todo hecho en UE5." },
          tags: ["UNREAL ENGINE 5", "PRODUCT VISUALIZER", "BLUEPRINTS"],
          link: "https://drive.google.com/file/d/1Fo-CWYmD92O5c0FYHA-7nA7qNG7wxhKk/view?usp=sharing",
          label: { en: "VESPA DEMO (256MB)", es: "DEMO VESPA (256MB)" }
        },
        {
          src: K + "noria.webp",
          cap: { en: "La Noria walkthrough", es: "Recorrido La Noria" },
          title: { en: "La Noria. Virtual Walkthrough", es: "La Noria. Recorrido Virtual" },
          body: { en: "From concept design to virtual space, available for client, ready to run on any Win. OS.", es: "Desde el diseño conceptual hasta el espacio virtual, disponible para el cliente, listo para ejecutarse en cualquier SO Windows." },
          tags: ["UNREAL ENGINE", "VIRTUAL TOUR", "REAL ESTATE"],
          link: "https://drive.google.com/file/d/1pRqUXbjGp3Xg5e0tV6hf56vLsCQH59QI/view?usp=share_link",
          label: { en: "\"LA NORIA\" DEMO (1.03GB)", es: "DEMO \"LA NORIA\" (1.03GB)" }
        },
        {
          src: K + "cold-room.webp",
          cap: { en: "VR Cold Room", es: "Cuarto Frío en RV" },
          title: { en: "VR Cold Room", es: "Cuarto Frío en RV" },
          body: { en: "Virtual space developed for quality assurance, Virtual Reality enhanced for Oculus Quest devices.", es: "Espacio virtual desarrollado para aseguramiento de calidad, Realidad Virtual mejorada desde dispositivos Oculus Quest." },
          tags: ["UNREAL ENGINE", "VR", "QUALITY ASSURANCE", "OCULUS QUEST"],
          link: "https://drive.google.com/file/d/1Ca8cECCBG4XWfYmt5ccio3K6k91mqwtX/view?usp=share_link",
          label: { en: "VR COLD ROOM DEMO (822MB)", es: "DEMO CUARTO FRÍO VR (822MB)" }
        }
      ]
    },
    {
      id: "musica",
      hue: [320, 38],
      eyebrow: { en: "MUSIC / AUDIO-REACTIVE", es: "MÚSICA / REACTIVO AL AUDIO" },
      title: { en: "Nous Deus · Reactive Discography", es: "Nous Deus · Discografía reactiva" },
      body: {
        en: "A complete sonic journey through my musical evolution. Listen to the full discography synchronized with reactive visuals.",
        es: "Un viaje sonoro completo a través de mi evolución musical. Escucha la discografía completa sincronizada con visuales reactivos."
      },
      tags: ["WEB AUDIO", "REACTIVE VISUALS", "2005 → 2025"],
      link: "https://musica.yosoydeus.com/",
      label: { en: "Listen now", es: "Escuchar ahora" },
      note: "musica.yosoydeus.com",
      head: "DISCOGRAFIA.WAV",
      shots: [
        { src: K + "musica-visuales.webp", cap: { en: "Visuals that react to the track", es: "Visuales que reaccionan al tema" } },
        { src: K + "musica-biblioteca.webp", cap: { en: "Library: one release per year", es: "Biblioteca: un lanzamiento por año" } },
        { src: K + "musica-inicio.webp", cap: { en: "Start screen", es: "Pantalla de inicio" } }
      ]
    },
    {
      id: "visualizer",
      hue: [135, 175],
      flip: true,
      eyebrow: { en: "LIVE VISUALS / REAL-TIME", es: "VISUALES EN VIVO / TIEMPO REAL" },
      title: { en: "Visual D3U5", es: "Visual D3U5" },
      body: {
        en: "Take control of the visuals. A real-time playground where audio input drives the generative art. I invite you to experience this application that works as a real-time audio reactive visualizer: a unique audiovisual experience where music comes to life.",
        es: "Toma el control de los visuales. Un patio de juegos en tiempo real donde el audio impulsa el arte generativo. Te invito a experimentar esta aplicación que funciona como un visualizador reactivo con audio en tiempo real: una experiencia audiovisual única donde la música cobra vida."
      },
      tags: ["GPU", "AUDIO-REACTIVE", "CAMERA + MIC", "OBS OUTPUT"],
      link: "https://visualizer.yosoydeus.com/",
      label: { en: "Launch visualizer", es: "Lanzar visualizador" },
      note: { en: "asks for camera and microphone", es: "pide cámara y micrófono" },
      head: "VISUAL_D3U5.CMD",
      shots: [
        { src: K + "visualizer-1.webp", cap: { en: "Start screen", es: "Pantalla de inicio" } },
        { src: K + "visualizer-2.webp", cap: { en: "Live output", es: "Salida en vivo" } }
      ]
    },
    {
      id: "webs",
      hue: [215, 190],
      eyebrow: { en: "WEB DESIGN / E‑COMMERCE", es: "DISEÑO WEB / TIENDAS EN LÍNEA" },
      title: { en: "Webs Deus: websites that look cinematic but load like products", es: "Webs Deus: sitios que se ven cinematográficos pero cargan como productos" },
      body: {
        en: "Beyond XR and realtime, I design and build web experiences and online stores that feel crafted, fast and easy to maintain. From one‑off landing pages to full e‑commerce setups, I handle design, implementation and launch.",
        es: "Además de XR y tiempo real, diseño y desarrollo experiencias web y tiendas en línea que se sienten cuidadas, rápidas y fáciles de mantener. Desde landings puntuales hasta e‑commerce completos, cubro diseño, implementación y lanzamiento."
      },
      lead: {
        en: "Real examples of sites and shops I have shipped: product launches, artist portfolios, and tailored e‑commerce flows ready to plug into your existing business.",
        es: "Ejemplos reales de sitios y tiendas que he entregado: lanzamientos de producto, portafolios de artistas y flujos de e‑commerce hechos a la medida de tu negocio."
      },
      tags: { en: ["CUSTOM WEB DESIGN", "LANDING PAGES", "ONLINE STORES", "CONVERSION‑FOCUSED"], es: ["DISEÑO WEB A MEDIDA", "LANDING PAGES", "TIENDAS EN LÍNEA", "ENFOQUE A CONVERSIÓN"] },
      link: "https://webs.yosoydeus.com/",
      label: { en: "View live web projects", es: "Ver proyectos web en vivo" },
      note: { en: "webs.yosoydeus.com · curated showcase of recent builds", es: "webs.yosoydeus.com · selección curada de trabajos recientes" },
      head: "WEB_SERVICES.WEB",
      shots: [
        { src: K + "webs-inicio.webp", cap: { en: "Webs Deus home", es: "Inicio de Webs Deus" } },
        { src: K + "webs-proyectos.webp", cap: { en: "Soul Living · luxury real estate", es: "Soul Living · bienes raíces de lujo" } },
        { src: K + "webs-industrial.webp", cap: { en: "Merz Inoxidables · MP Simsa", es: "Merz Inoxidables · MP Simsa" } }
      ]
    },
    {
      id: "ar",
      mini: true,
      hue: [260, 195],
      eyebrow: { en: "AR / WEB3", es: "AR / WEB3" },
      title: { en: "Augmented Reality Object", es: "Objeto de Realidad Aumentada" },
      body: {
        en: "Real life object projection for web3. This allows viewing 3D models of products in Augmented Reality on any compatible device, directly from the browser.",
        es: "Proyección de objetos de la vida real para web3. Permite ver modelos 3D de productos en Realidad Aumentada en cualquier dispositivo compatible, directamente desde el navegador."
      },
      tags: ["AUGMENTED REALITY", "WEB3", "3D MODELING", "GOOGLE-MODEL-VIEWER"],
      head: "AR_OBJECT.GLB",
      cap: { en: "Drag to rotate · AR on compatible phones", es: "Arrastra para girar · AR en celulares compatibles" },
      model: "https://modelviewer.dev/shared-assets/models/Astronaut.glb"
    },
    {
      id: "ia",
      mini: true,
      hue: [190, 285],
      eyebrow: { en: "AI / SALES AUTOMATION", es: "IA / AUTOMATIZACIÓN DE VENTAS" },
      title: { en: "AI-Powered Virtual Assistant", es: "Asistente Virtual con IA" },
      body: {
        en: "This isn't just a chatbot. It's a bespoke language model trained to revolutionize client interaction by acting as an expert sales agent, providing instant pre-quotes, and scheduling appointments.",
        es: "No es solo un chatbot. Es un modelo de lenguaje a medida, entrenado para revolucionar la interacción con clientes actuando como un agente de ventas experto, con pre‑cotizaciones al instante y citas agendadas."
      },
      tags: ["AI", "LANGUAGE MODELS", "SALES AUTOMATION", "GEMINI API"],
      action: "assistant",
      label: { en: "Activate Assistant", es: "Activar Asistente" },
      head: "ASSISTANT.AI",
      cap: { en: "Ask it about my work", es: "Pregúntale por mi trabajo" }
    }
  ];

  var INTRO = {
    eyebrow: { en: "// SELECTED WORK", es: "// TRABAJO SELECTO" },
    title: { en: "Projects, at a glance", es: "Proyectos, de un vistazo" },
    body: {
      en: "Everything I have published with a link, in one place. Browse each one with the thumbnails, or open the project.",
      es: "Todo lo que he publicado con enlace, en un solo lugar. Recorre cada uno con las miniaturas o abre el proyecto."
    }
  };

  var state = {}; // miniatura elegida por tarjeta
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function lang() { return document.documentElement.lang === "es" ? "es" : "en"; }
  function tr(v) { return v && typeof v === "object" && !Array.isArray(v) ? v[lang()] : v; }
  function two(n) { return (n < 10 ? "0" : "") + n; }

  var ROBOT =
    '<svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="38" y="52" width="84" height="64" rx="16"/><path d="M80 52V34"/><circle cx="80" cy="28" r="6"/>' +
    '<circle cx="62" cy="82" r="8"/><circle cx="98" cy="82" r="8"/><path d="M64 102h32"/><path d="M26 76v16M134 76v16"/></g></svg>';

  function build() {
    var host = document.getElementById("deus-work");
    if (!host || host.getAttribute("data-built")) return host;
    host.setAttribute("data-built", "1");
    var total = CARDS.length;
    var html =
      '<div class="deus-work-head">' +
      '<div class="deus-modules-eyebrow font-tech" data-intro="eyebrow"></div>' +
      '<h2 class="deus-work-title" data-intro="title"></h2>' +
      '<p class="deus-work-lead" data-intro="body"></p></div>';
    var mini = "";
    CARDS.forEach(function (c, i) {
      var card = cardHtml(c, i + 1, total);
      if (c.mini) mini += card;
      else html += card;
    });
    html += '<div class="deus-mini-row">' + mini + "</div>";
    host.innerHTML = html;
    return host;
  }

  function cardHtml(c, n, total) {
    var multi = c.shots && c.shots.length > 1;
    var stage;
    if (c.model) {
      stage = '<model-viewer src="' + c.model + '" alt="3D model" camera-controls auto-rotate ar ar-modes="webxr scene-viewer quick-look" loading="lazy" style="width:100%;height:100%;background:transparent"></model-viewer>';
    } else if (c.action) {
      stage = '<div class="deus-ai-stage">' + ROBOT + '<span class="deus-ai-ring"></span><span class="deus-ai-ring r2"></span></div>';
    } else {
      stage = '<img data-main width="1280" height="800" alt="" decoding="async" />';
    }
    var thumbs = "";
    if (multi) {
      thumbs = '<div class="deus-ui-thumbs" style="--n:' + c.shots.length + '">';
      c.shots.forEach(function (s, i) {
        thumbs += '<button type="button" class="deus-ui-thumb' + (i === 0 ? " is-on" : "") + '" data-i="' + i + '"><img data-src="' + s.src.replace(/([^\/]+)$/, "t/$1") + '" alt="" width="320" height="200" decoding="async" /></button>';
      });
      thumbs += "</div>";
    }
    var hasLink = c.link || (c.shots && c.shots[0].link) || c.action;
    var actions = hasLink
      ? '<div class="deus-ui-actions"><' + (c.action ? 'button type="button"' : 'a target="_blank" rel="noopener noreferrer"') + ' class="deus-ui-link" data-link><span data-t="label"></span><span class="deus-ui-link-arrow" aria-hidden="true">' + (c.action ? "✦" : "↗") + "</span></" + (c.action ? "button" : "a") + '><span class="deus-ui-note" data-t="note"></span></div>'
      : "";
    return (
      '<article class="deus-ui deus-work-card' + (c.flip ? " is-flip" : "") + (c.mini ? " deus-mini" : "") + '" id="work-' + c.id + '" data-card="' + c.id + '" data-hue="' + c.hue[0] + '" data-hue-b="' + c.hue[1] + '" style="--ac:' + c.hue[0] + '">' +
      '<div class="deus-ui-inner"><div class="deus-ui-copy">' +
      '<div class="deus-ui-eyebrow font-tech"><span class="deus-ui-idx">' + two(n) + "<i>/" + two(total) + '</i></span><span data-t="eyebrow"></span></div>' +
      '<h3 class="deus-ui-title" data-t="title"></h3>' +
      '<p class="deus-ui-body" data-t="body"></p>' +
      '<p class="deus-ui-lead" data-t="lead"></p>' +
      '<div class="deus-ui-tags" data-tags></div>' +
      actions +
      "</div>" +
      '<div class="deus-ui-gallery"><div class="deus-ui-gallery-head"><span>' + c.head + '</span><span class="deus-ui-caption" data-t="cap"></span></div>' +
      '<div class="deus-ui-stage">' + stage + "</div>" + thumbs + "</div></div></article>"
    );
  }

  function pick(c, key) {
    var s = c.shots ? c.shots[state[c.id] || 0] : null;
    return s && s[key] !== undefined ? s[key] : c[key];
  }

  function setT(el, key, val) {
    var t = el.querySelector('[data-t="' + key + '"]');
    if (!t) return;
    val = tr(val) || "";
    if (t.textContent !== val) t.textContent = val;
    if (key === "lead" || key === "note") t.style.display = val ? "" : "none";
  }

  function refresh(c) {
    var el = document.getElementById("work-" + c.id);
    if (!el) return;
    var s = c.shots ? c.shots[state[c.id] || 0] : null;
    setT(el, "eyebrow", c.eyebrow);
    setT(el, "title", pick(c, "title"));
    setT(el, "body", pick(c, "body"));
    setT(el, "lead", c.lead || "");
    setT(el, "label", pick(c, "label"));
    setT(el, "note", pick(c, "note"));
    setT(el, "cap", s ? s.cap : c.cap);
    var tags = pick(c, "tags");
    if (tags && !Array.isArray(tags)) tags = tags[lang()];
    var box = el.querySelector("[data-tags]");
    var sig = (tags || []).join("|");
    if (box.getAttribute("data-sig") !== sig) {
      box.setAttribute("data-sig", sig);
      box.innerHTML = "";
      (tags || []).forEach(function (t) {
        var d = document.createElement("div");
        d.className = "deus-ui-tag font-tech";
        d.textContent = t;
        box.appendChild(d);
      });
    }
    var a = el.querySelector("[data-link]");
    if (a && a.tagName === "A") a.href = pick(c, "link");
    var img = el.querySelector("img[data-main]");
    if (img && s) {
      if (!img.getAttribute("src") && !img.getAttribute("data-src")) img.setAttribute("data-src", s.src); // lo carga deus-lazy.js al acercarse
      img.alt = (tr(c.title) || tr(s.title) || "") + ": " + tr(s.cap);
    }
  }

  function choose(c, i) {
    var el = document.getElementById("work-" + c.id);
    var img = el.querySelector("img[data-main]");
    state[c.id] = i;
    [].forEach.call(el.querySelectorAll(".deus-ui-thumb"), function (b) {
      var on = +b.getAttribute("data-i") === i;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var next = new Image();
    img.removeAttribute("data-src");
    img.classList.add("is-swapping");
    next.onload = function () {
      img.src = c.shots[i].src;
      requestAnimationFrame(function () { img.classList.remove("is-swapping"); });
    };
    next.onerror = function () { img.classList.remove("is-swapping"); };
    next.src = c.shots[i].src;
    refresh(c);
  }

  function intro() {
    var h = document.getElementById("deus-work");
    if (!h) return;
    [].forEach.call(h.querySelectorAll("[data-intro]"), function (e) {
      var v = tr(INTRO[e.getAttribute("data-intro")]);
      if (e.textContent !== v) e.textContent = v;
    });
  }

  function labels() {
    CARDS.forEach(function (c) {
      var el = document.getElementById("work-" + c.id);
      if (!el) return;
      [].forEach.call(el.querySelectorAll(".deus-ui-thumb"), function (b) {
        var s = c.shots[+b.getAttribute("data-i")];
        b.setAttribute("aria-label", tr(s.cap));
      });
    });
  }

  function applyAll() {
    intro();
    CARDS.forEach(refresh);
    labels();
  }

  // El visor 3D pesa 250 KB: se carga cuando la tarjeta de AR está a menos de 900 px de la pantalla.
  function lazyViewer() {
    var mv = document.querySelector("#work-ar model-viewer");
    if (!mv) return;
    var url = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js", done = false;
    function near() {
      if (done) return;
      if (mv.getBoundingClientRect().top < window.innerHeight + 900) {
        done = true;
        var sc = document.createElement("script");
        sc.type = "module";
        sc.src = url;
        document.head.appendChild(sc);
        window.removeEventListener("scroll", near);
        window.removeEventListener("resize", near);
      }
    }
    window.addEventListener("scroll", near, { passive: true });
    window.addEventListener("resize", near);
    near();
  }

  function wire() {
    lazyViewer();
    CARDS.forEach(function (c) {
      var el = document.getElementById("work-" + c.id);
      if (!el) return;
      [].forEach.call(el.querySelectorAll(".deus-ui-thumb"), function (b) {
        b.addEventListener("click", function () { choose(c, +b.getAttribute("data-i")); });
      });
      if (c.action === "assistant") {
        el.querySelector("[data-link]").addEventListener("click", function () {
          if (window.chatbase) window.chatbase("open");
        });
      }
      // inclinación suave de la galería con el mouse
      var g = el.querySelector(".deus-ui-gallery");
      if (g && !reduce && !c.mini) {
        g.addEventListener("pointermove", function (e) {
          if (e.pointerType !== "mouse") return;
          var r = g.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          g.style.transform = "perspective(1100px) rotateY(" + x * 5 + "deg) rotateX(" + -y * 4 + "deg)";
        });
        g.addEventListener("pointerleave", function () { g.style.transform = ""; });
      }
    });
    // entrada al hacer scroll
    var cards = [].slice.call(document.querySelectorAll(".deus-work-card"));
    if (reduce || !("IntersectionObserver" in window)) {
      cards.forEach(function (e) { e.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      cards.forEach(function (e) { io.observe(e); });
      setTimeout(function () { cards.forEach(function (e) { if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add("is-in"); }); }, 1500);
    // respaldo por scroll: si el navegador no avisa por el observador, igual aparece al llegar
    var pendingReveal = cards.slice();
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
  }

  // Debajo del hero y antes del hub de experiencia (el DOM de React tarda en aparecer).
  // Las secciones viven como hijos de <body> (después de #root), fuera del DOM que repinta React.
  function place() {
    return !!document.getElementById("deus-work");
  }

  function boot() {
    if (!build()) return;
    wire();
    applyAll();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var ok = place();
      if (ok) window.dispatchEvent(new Event("deus:layout"));
      if (ok || tries >= 40) clearInterval(iv);
    }, 250);
    new MutationObserver(function () { applyAll(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  // el script es defer: el DOM ya existe. No espera a "load" (el video del reel lo retrasa mucho).
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
