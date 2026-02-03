import React, { useEffect, useRef } from "react";

/**
 * COMPONENT: LASER LIGHT SHOW BACKGROUND
 *
 * Renders a 2D canvas animation of rotating laser beams.
 */
export const LaserBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    class Beam {
      x: number = 0;
      angle: number = 0;
      width: number = 0;
      opacity: number = 0;
      targetOpacity: number = 0;
      color: string = "";
      speed: number = 0;
      life: number = 0;
      maxLife: number = 0;
      phase: "in" | "hold" | "out" = "in";

      constructor(private colors: string[]) {
        this.init();
      }

      init() {
        this.x = Math.random() * width;
        this.angle = Math.PI / 2 + (Math.random() - 0.5) * 2.5; // More erratic angles
        this.width = Math.random() * 3 + 1; // Thicker, harsher beams
        this.opacity = 0;
        this.targetOpacity = Math.random() * 0.8 + 0.2;
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.speed = (Math.random() - 0.5) * 0.08; // Faster speed (was 0.02)
        this.life = 0;
        this.maxLife = 50 + Math.random() * 100; // Shorter life, more chaotic
        this.phase = "in";
      }

      update() {
        this.life++;
        this.angle += this.speed;

        if (this.phase === "in") {
          this.opacity += 0.05; // Faster fade in
          if (this.opacity >= this.targetOpacity) this.phase = "hold";
        } else if (this.phase === "hold") {
          if (this.life > this.maxLife) this.phase = "out";
          // Random flicker
          if (Math.random() > 0.9) this.opacity = Math.random();
        } else if (this.phase === "out") {
          this.opacity -= 0.05;
          if (this.opacity <= 0) this.init();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(width / 2, -100);
        ctx.rotate(this.angle);

        // Harsher, sharper gradient (no soft fade)
        const gradient = ctx.createLinearGradient(0, 0, 0, height * 1.5);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.1, this.color); // Solid core
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.moveTo(-this.width, 0);
        ctx.lineTo(this.width, 0);
        ctx.lineTo(this.width * 20, height * 2);
        ctx.lineTo(-this.width * 20, height * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const beams: Beam[] = [];
    const colors = ["#d000ff", "#a855f7", "#ffffff", "#ff003c"]; // Neon Pink, Purple, White, Red (Accent)

    for (let i = 0; i < 20; i++) beams.push(new Beam(colors));

    let animationId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(5, 5, 5, 0.2)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      beams.forEach((beam) => {
        beam.update();
        beam.draw(ctx);
      });

      ctx.globalCompositeOperation = "source-over";
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};
