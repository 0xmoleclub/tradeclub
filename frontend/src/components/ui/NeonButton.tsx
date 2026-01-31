import React from "react";
import { LucideIcon } from "lucide-react";

interface NeonButtonProps {
  children: React.ReactNode;
  color?: string;
  icon?: LucideIcon;
}

export const NeonButton = ({ children, color = "magenta", icon: Icon }: NeonButtonProps) => (
  <button
    className={`group relative px-8 py-4 bg-transparent border border-${color}-500/50 text-${color}-500 font-black uppercase tracking-[0.2em] overflow-hidden hover:bg-${color}-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,0,255,0.4)] hover:scale-105 active:scale-95`}
  >
    <span className="relative z-10 flex items-center gap-3">
      {Icon && <Icon size={18} />}
      {children}
    </span>
    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-[-200%] transition-transform duration-700 ease-out transform rotate-12 h-[200%]" />
  </button>
);
