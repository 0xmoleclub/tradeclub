import React from "react";
import { LucideIcon } from "lucide-react";

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  color?: "white" | "red" | "cyan" | "yellow" | "magenta" | "purple";
}

export const SectionTitle = ({ title, icon: Icon, color = "white" }: SectionTitleProps) => (
  <div className="flex items-center gap-3 mb-8 group">
    {Icon && (
      <Icon
        className={`text-${color === "white" ? "gray" : color}-500 group-hover:scale-110 transition-transform`}
        size={20}
        // Tailwind might need full class names for safelist, using style to be safe or assuming consistent naming
        style={{ color: color !== "white" ? `var(--color-${color})` : undefined }}
      />
    )}
    {/* Explicit color classes for Tailwind JIT to pick up if dynamically constructed classes fail without config */}
    {/* Using standard text-transparent bg-clip-text for title */}
    <h2 className="text-2xl font-black font-['Rajdhani'] uppercase italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{title}</h2>
    <div className={`h-[1px] flex-1 bg-gradient-to-r from-${color}-500/50 to-transparent`} />
  </div>
);
