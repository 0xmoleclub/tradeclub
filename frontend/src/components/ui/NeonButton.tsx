import React, { ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  color?: "magenta" | "cyan" | "purple" | "green";
  icon?: LucideIcon;
}

export const NeonButton = ({ children, color = "magenta", icon: Icon, className = "", ...props }: NeonButtonProps) => {
  const colorClasses = {
    magenta: "border-magenta-500/50 text-magenta-500 hover:bg-magenta-500 hover:shadow-[0_0_30px_rgba(255,0,255,0.4)]",
    cyan: "border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]",
    purple: "border-purple-500/50 text-purple-500 hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]",
    green: "border-green-500/50 text-green-500 hover:bg-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]",
  };

  return (
    <button
      className={`group relative px-6 py-3 bg-transparent border font-black uppercase tracking-[0.2em] overflow-hidden hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 ${colorClasses[color]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-3">
        {Icon && <Icon size={18} />}
        {children}
      </span>
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-[-200%] transition-transform duration-700 ease-out transform rotate-12 h-[200%]" />
    </button>
  );
};
