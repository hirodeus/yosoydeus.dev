let ytPlayer;

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('bg-video', {
        events: {
            onReady: onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    event.target.mute();
    event.target.setPlaybackRate(0.5);
    event.target.playVideo();
}

gsap.registerPlugin(ScrollTrigger, TextPlugin);

// Asegurar que inicie en el tope
window.scrollTo(0, 0);

window.addEventListener('load', () => {
    const mainContent = document.getElementById('main-content');
    const introContainer = document.getElementById('intro-container');
    const introText = document.getElementById('intro-text');
    const skipIntro = document.getElementById('skip-intro');
    if (introContainer) {
        introContainer.style.pointerEvents = 'auto';
    }
    
    const masterTl = gsap.timeline();

    function revealHero() {
        const tl = gsap.timeline();
        tl
            .set(mainContent, { opacity: 1 })
            .from("#hero-title", { y: 100, opacity: 0, duration: 1.5, ease: "power4.out" })
            .from("#hero-sub", { opacity: 0, duration: 1 }, "-=1");
        return tl;
    }

    // 1. SECUENCIA DE INTRO
    const frases = [
        "¿Necesitas una página moderna?",
        "¿Que logre tus objetivos de marca?",
        "Aquí está la solución."
    ];

    frases.forEach((f) => {
        masterTl.to(introText, { text: f, opacity: 1, duration: 1.2, ease: "power2.out" })
                .to(introText, { opacity: 0, duration: 0.8, delay: 1.2 });
    });

    if (skipIntro) {
        skipIntro.addEventListener('click', () => {
            try { masterTl.kill(); } catch (e) {}
            if (introContainer) {
                gsap.set(introContainer, { opacity: 0 });
                introContainer.style.pointerEvents = 'none';
            }
            revealHero();
        });
    }

    // 2. REVELAR CONTENIDO
    masterTl.to(introContainer, { opacity: 0, duration: 1, pointerEvents: "none" })
            .add(() => revealHero());

    // 3. CONTADORES (Animación al hacer scroll)
    function animateCount(id, target) {
        let obj = { val: 0 };
        gsap.to(obj, {
            val: target,
            duration: 3,
            scrollTrigger: {
                trigger: `#${id}`,
                start: "top 90%"
            },
            onUpdate: function () {
                document.getElementById(id).innerHTML = Math.ceil(obj.val);
            }
        });
    }

    animateCount("count-projects", 15);
    animateCount("count-visits", 120);
    animateCount("count-conv", 45);

    // 4. MARQUEE
    gsap.to("#marquee", {
        xPercent: -50,
        duration: 26,
        ease: "none",
        repeat: -1
    });

    // 5. ANIMACIÓN DE TARJETAS
    gsap.utils.toArray(".project-card").forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
            },
            y: 100,
            opacity: 0,
            duration: 1.5,
            ease: "power3.out"
        });
    });

    // 6. FIX PARA EL LOOP DEL VIDEO (Evitar frames en negro)
    setInterval(() => {
        const overlay = document.getElementById('video-darkness');
        gsap.to(overlay, { opacity: 1, duration: 0.5 });
        setTimeout(() => {
            gsap.to(overlay, { opacity: 0.7, duration: 1 });
        }, 800);
    }, 14000); // Se activa justo antes de que el video de YouTube reinicie

    const footer = document.getElementById('footer-contact');
    const nav = document.getElementById('main-nav');

    if (footer && nav) {
        ScrollTrigger.create({
            trigger: footer,
            start: "top bottom",
            end: "top center",
            onEnter: () => {
                gsap.to(nav, { opacity: 0, duration: 0.5 });
                gsap.to(footer, { opacity: 1, duration: 0.5 });
                footer.classList.remove('pointer-events-none');
            },
            onLeaveBack: () => {
                gsap.to(nav, { opacity: 1, duration: 0.5 });
                gsap.to(footer, { opacity: 0, duration: 0.5, onComplete: () => footer.classList.add('pointer-events-none') });
            }
        });
    }
});
