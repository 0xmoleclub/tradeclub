import React from "react";

interface VisualizerBarProps {
  color: string;
  delay: number;
}

export const VisualizerBar = ({ color, delay }: VisualizerBarProps) => (
  <div
    className={`w-1.5 mx-0.5 rounded-full bg-${color}-500 animate-pulse`}
    style={{
      height: "30px",
      animation: `equalizer 0.8s ease-in-out infinite alternate`,
      animationDelay: `${delay}s`,
    }}
  />
);
