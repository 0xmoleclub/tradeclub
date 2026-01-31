import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassPanel = ({ children, className = "" }: GlassPanelProps) => (
  <div className={`bg-[#050505]/90 backdrop-blur-sm border border-[#333] hover:border-[#ff003c]/50 transition-colors duration-300 ${className}`}>
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none mix-blend-overlay" />
    {children}
  </div>
);
