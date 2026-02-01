import React, { HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassPanel = ({ children, className = "", style = {}, ...props }: GlassPanelProps) => (
  <div className={`bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden relative ${className}`} style={style} {...props}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    {children}
  </div>
);
