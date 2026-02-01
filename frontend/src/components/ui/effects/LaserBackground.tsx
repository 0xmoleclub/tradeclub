import React, { useEffect, useRef } from "react";

interface LaserBackgroundProps {
  intensity?: number;
}

export const LaserBackground = ({ intensity = 1.0 }: LaserBackgroundProps) => {
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

    const beams: Beam[] = [];
    const colors = ["#2dd4bf", "#06b6d4", "#d946ef", "#a855f7"];

    class Beam {
      x: number;
      angle: number;
      width: number;
      opacity: number;
      targetOpacity: number;
      color: string;
      speed: number;
      life: number;
      maxLife: number;
      phase: "in" | "hold" | "out";

      constructor() {
        this.x = 0;
        this.angle = 0;
        this.width = 0;
        this.opacity = 0;
        this.targetOpacity = 0;
        this.color = "";
        this.speed = 0;
        this.life = 0;
        this.maxLife = 0;
        this.phase = "in";
        this.init();
      }

      init() {
        this.x = Math.random() * width;
        this.angle = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        this.width = Math.random() * 2 + 0.5;
        this.opacity = 0;
        this.targetOpacity = (Math.random() * 0.5 + 0.2) * intensity;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.speed = (Math.random() - 0.5) * 0.02;
        this.life = 0;
        this.maxLife = 100 + Math.random() * 200;
        this.phase = "in";
      }

      update() {
        this.life++;
        this.angle += this.speed;
        if (this.phase === "in") {
          this.opacity += 0.01;
          if (this.opacity >= this.targetOpacity) this.phase = "hold";
        } else if (this.phase === "hold") {
          if (this.life > this.maxLife) this.phase = "out";
        } else if (this.phase === "out") {
          this.opacity -= 0.01;
          if (this.opacity <= 0) this.init();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(width / 2, -100);
        ctx.rotate(this.angle);
        const gradient = ctx.createLinearGradient(0, 0, 0, height * 1.5);
        gradient.addColorStop(0, this.color);
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

    for (let i = 0; i < 15; i++) beams.push(new Beam());

    let animationId: number;
    const animate = () => {
      if (!ctx) return;
      ctx.fillStyle = `rgba(5, 5, 5, ${0.2 / intensity})`;
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
  }, [intensity]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};
