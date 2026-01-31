import { useState, useEffect } from "react";

/**
 * HOOK: MOUSE PARALLAX
 *
 * Tracks mouse movement relative to the window center to create
 * parallax effects for UI elements.
 */
export const useMouseParallax = (strength = 20) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setOffset({
        x: (e.clientX - window.innerWidth / 2) / strength,
        y: (e.clientY - window.innerHeight / 2) / strength,
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [strength]);

  return offset;
};
