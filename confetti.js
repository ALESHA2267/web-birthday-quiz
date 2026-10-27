/**
 * Высокопроизводительный движок праздничного конфетти на Canvas 2D
 * Кибернетические частицы, неоновые цвета, 3D-вращение и праздничные взрывы.
 */

class ConfettiEngine {
  constructor(canvasId = "confetti-canvas") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = canvasId;
      this.canvas.className = "confetti-canvas";
      document.body.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.animationId = null;
    this.colors = [
      "#00f0ff", // Кибер-бирюзовый
      "#b026ff", // Неоновый фиолетовый
      "#00ffa3", // Неоновый зелёный
      "#ffd000", // Золотой
      "#ff2a6d", // Неоновый розовый/красный
      "#ffffff", // Чистый белый
      "#3a86ff"  // Электрик блю
    ];

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  createParticle(x, y, speedMult = 1, angleRange = null) {
    const angle = angleRange 
      ? angleRange.min + Math.random() * (angleRange.max - angleRange.min)
      : Math.random() * Math.PI * 2;
    const speed = (Math.random() * 8 + 3) * speedMult;
    const size = Math.random() * 8 + 5;
    const shapes = ["rect", "circle", "diamond", "ribbon"];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      tilt: Math.random() * 10,
      tiltSpeed: Math.random() * 0.1 + 0.05,
      tiltAngle: Math.random() * Math.PI,
      shape,
      gravity: 0.22,
      drag: 0.985,
      alpha: 1,
      decay: Math.random() * 0.005 + 0.003
    };
  }

  // Небольшой взрыв конфетти (например, при правильном ответе на сложный вопрос)
  burst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 40) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y, 1.2));
    }
    this.startLoop();
  }

  // Грандиозный праздничный фейерверк для финала
  celebrate(durationMs = 4000) {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        clearInterval(interval);
        return;
      }

      // Пушки слева и справа снизу
      for (let i = 0; i < 15; i++) {
        this.particles.push(
          this.createParticle(
            Math.random() * 100, 
            this.height - 50, 
            1.8, 
            { min: -Math.PI / 2.2, max: -Math.PI / 4 }
          )
        );
        this.particles.push(
          this.createParticle(
            this.width - Math.random() * 100, 
            this.height - 50, 
            1.8, 
            { min: -Math.PI * 0.75, max: -Math.PI / 1.8 }
          )
        );
      }

      // Сверху периодически падающий салют
      if (Math.random() > 0.5) {
        this.burst(Math.random() * this.width, Math.random() * (this.height * 0.4), 25);
      }

      this.startLoop();
    }, 180);
  }

  startLoop() {
    if (!this.animationId) {
      this.loop = this.loop.bind(this);
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.tiltAngle += p.tiltSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;

      if (p.shape === "rect") {
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (p.tilt / 15));
      } else if (p.shape === "circle") {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.shape === "diamond") {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size);
        this.ctx.lineTo(p.size * 0.7, 0);
        this.ctx.lineTo(0, p.size);
        this.ctx.lineTo(-p.size * 0.7, 0);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Лента
        this.ctx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.animationId = null;
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.particles = [];
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

window.confetti = new ConfettiEngine();
