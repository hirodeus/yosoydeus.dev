/**
 * Splash Screen Animation
 * Cloud points and grid lines animation for the welcome screen
 */

class SplashAnimation {
  constructor() {
    this.canvas = document.getElementById('splashCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.gridLines = [];
    this.mouse = { x: 0, y: 0 };
    this.time = 0;
    this.animationId = null;

    this.isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.createGridLines();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.isMobile = window.innerWidth < 768;
  }

  createParticles() {
    const particleCount = this.isMobile ? 60 : 150;
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 1000,
        originalZ: Math.random() * 1000,
        speed: 0.5 + Math.random() * 1.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: {
          r: 100 + Math.random() * 50,
          g: 150 + Math.random() * 100,
          b: 200 + Math.random() * 55
        }
      });
    }
  }

  createGridLines() {
    const gridSize = 40;
    this.gridLines = [];

    // Crear líneas horizontales
    for (let y = 0; y < this.canvas.height + gridSize; y += gridSize) {
      this.gridLines.push({
        type: 'horizontal',
        y: y,
        opacity: 0.1 + Math.random() * 0.2,
        speed: 0.5 + Math.random() * 0.5
      });
    }

    // Crear líneas verticales
    for (let x = 0; x < this.canvas.width + gridSize; x += gridSize) {
      this.gridLines.push({
        type: 'vertical',
        x: x,
        opacity: 0.1 + Math.random() * 0.2,
        speed: 0.5 + Math.random() * 0.5
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
      this.createGridLines();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  updateParticles() {
    this.particles.forEach(particle => {
      // Movimiento parallax 3D
      particle.z -= particle.speed;

      // Resetear partícula cuando se aleja demasiado
      if (particle.z <= 0) {
        particle.z = 1000;
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
      }

      // Calcular posición 2D desde 3D
      const scale = 1000 / (1000 + particle.z);
      const x2d = (particle.x - this.canvas.width / 2) * scale + this.canvas.width / 2;
      const y2d = (particle.y - this.canvas.height / 2) * scale + this.canvas.height / 2;

      // Interacción con el mouse
      const dx = this.mouse.x - x2d;
      const dy = this.mouse.y - y2d;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        const force = (150 - distance) / 150;
        particle.x -= dx * force * 0.02;
        particle.y -= dy * force * 0.02;
      }

      // Guardar posiciones calculadas para el renderizado
      particle.x2d = x2d;
      particle.y2d = y2d;
      particle.scale = scale;
    });
  }

  updateGridLines() {
    this.gridLines.forEach(line => {
      // Animar opacidad
      line.opacity += Math.sin(this.time * line.speed * 0.001) * 0.001;
      line.opacity = Math.max(0.05, Math.min(0.3, line.opacity));
    });
  }

  drawParticles() {
    this.particles.forEach(particle => {
      const { x2d, y2d, scale, size, opacity, color } = particle;

      this.ctx.save();
      this.ctx.globalAlpha = opacity * scale;
      this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      if (!this.isMobile) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
      }

      this.ctx.beginPath();
      this.ctx.arc(x2d, y2d, size * scale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawGridLines() {
    this.ctx.save();
    this.ctx.strokeStyle = '#4a90e2';
    this.ctx.lineWidth = 1;

    this.gridLines.forEach(line => {
      this.ctx.globalAlpha = line.opacity;
      this.ctx.beginPath();

      if (line.type === 'horizontal') {
        this.ctx.moveTo(0, line.y);
        this.ctx.lineTo(this.canvas.width, line.y);
      } else {
        this.ctx.moveTo(line.x, 0);
        this.ctx.lineTo(line.x, this.canvas.height);
      }

      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  drawConnections() {
    // Conectar partículas cercanas
    this.ctx.save();
    this.ctx.strokeStyle = '#6bb6ff';
    this.ctx.lineWidth = 0.5;

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];

        const dx = p1.x2d - p2.x2d;
        const dy = p1.y2d - p2.y2d;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.isMobile ? 60 : 100;

        if (distance < maxDist) {
          const opacity = (maxDist - distance) / maxDist * 0.3;
          this.ctx.globalAlpha = opacity;

          this.ctx.beginPath();
          this.ctx.moveTo(p1.x2d, p1.y2d);
          this.ctx.lineTo(p2.x2d, p2.y2d);
          this.ctx.stroke();
        }
      }
    }

    this.ctx.restore();
  }

  animate() {
    this.time += 16; // Aproximadamente 60fps

    // Limpiar canvas con efecto de desvanecimiento
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Actualizar y dibujar
    this.updateGridLines();
    this.updateParticles();

    this.drawGridLines();
    this.drawConnections();
    this.drawParticles();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Desvanecer gradualmente
    let fadeOut = () => {
      this.ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (parseFloat(this.canvas.style.opacity || '1') > 0) {
        this.canvas.style.opacity = Math.max(0, parseFloat(this.canvas.style.opacity || '1') - 0.05);
        requestAnimationFrame(fadeOut);
      } else {
        this.canvas.style.display = 'none';
      }
    };

    fadeOut();
  }
}

// Inicializar cuando el DOM esté listo
// Inicializar
const initSplash = () => {
  const splashAnimation = new SplashAnimation();

  // Detener la animación cuando se inicie la aplicación
  const btnStart = document.getElementById('btnStart');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      setTimeout(() => {
        splashAnimation.stop();
      }, 500); // Pequeño retraso para una transición suave
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSplash);
} else {
  initSplash();
}