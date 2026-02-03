import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title?: React.ReactNode;
  backUrl?: string;
  backLabel?: string;
  rightContent?: React.ReactNode;
  showNetworkStatus?: boolean;
  position?: "fixed" | "static" | "relative";
  titleAlignment?: "center" | "left";
  className?: string;
}

export const PageHeader = ({ title, backUrl = "/", backLabel = "Back", rightContent, showNetworkStatus = false, position = "static", titleAlignment = "center", className = "" }: PageHeaderProps) => {
  return (
    <header
      className={`
        ${position === "fixed" ? "fixed top-0 left-0 right-0 z-50" : "relative z-20 shrink-0 w-full"}
        h-16 px-6
        bg-[#050505]/90 backdrop-blur-xl border-b border-white/10
        flex items-center justify-between
        ${className}
      `}
    >
      {/* Left / Back Button */}
      <div className="flex items-center gap-4 min-w-[150px]">
        <Link href={backUrl} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">{backLabel}</span>
        </Link>

        {/* Left Aligned Title (if requested) */}
        {titleAlignment === "left" && title && (
          <>
            <div className="h-6 w-[1px] bg-white/10" />
            <div className="text-xl font-black italic uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{title}</div>
          </>
        )}
      </div>

      {/* Center Title (default) */}
      {titleAlignment === "center" && title && (
        <div className="absolute left-1/2 -translate-x-1/2 text-xl font-black italic uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 pointer-events-none">
          {title}
        </div>
      )}

      {/* Right Content */}
      <div className="flex items-center gap-6 min-w-[150px] justify-end">
        {showNetworkStatus && (
          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-gray-400">NETWORK: 14ms</span>
          </div>
        )}
        {rightContent}
      </div>
    </header>
  );
};
