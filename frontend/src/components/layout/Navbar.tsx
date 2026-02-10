import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sword, Trophy, Cpu, Repeat, TrendingUp, Eye, Wallet } from "lucide-react";
import { WalletButton } from "@/components/ui/WalletButton";

const NAV_MENU = [
  {
    label: "TRADE",
    items: [
      { label: "SWAP", desc: "Instant Execution", icon: Repeat, href: "/swap" },
      { label: "PERPETUAL", desc: "100x Leverage", icon: TrendingUp, href: "/perpetual" },
    ],
  },
  {
    label: "ARENA",
    items: [
      { label: "BATTLE", desc: "PvP Trading", icon: Sword, href: "/create-match" },
      { label: "WATCH & PREDICT", desc: "Spectate & Win", icon: Eye, href: "/watch-and-predict" },
    ],
  },
  { label: "LEADERBOARD", href: "/leaderboard", icon: Trophy },
  { label: "AI CHAT", href: "/chat", icon: Cpu },
  { label: "PORTFOLIO", href: "/portfolio", icon: Wallet },
];

export const Navbar = () => {
  const [scrollY, setScrollY] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrollY > 50 ? "bg-black/90 backdrop-blur-xl border-white/10 py-4" : "bg-transparent border-transparent py-6"
      }`}
    >
      <div className="max-w-[1800px] mx-auto px-8 flex justify-between items-center relative">
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-4 group cursor-pointer z-50">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center group-hover:border-neon transition-colors">
              <div className="w-3 h-3 bg-white rounded-full group-hover:bg-neon group-hover:shadow-[0_0_10px_var(--color-neon)] transition-all" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black uppercase tracking-[0.2em] italic leading-none group-hover:text-neon transition-colors font-rajdhani">TradeClub</span>
            <span className="text-[10px] font-bold text-gray-400 tracking-[0.4em] uppercase mt-1 group-hover:text-white transition-colors">Nightlife Protocol</span>
          </div>
        </Link>

        {/* Center Menu - Pill Style */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1 p-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]">
          {NAV_MENU.map((item, i) => {
            const isActive = item.href === pathname || (item.items && item.items.some((sub) => sub.href === pathname));

            return (
              <div key={i} className="relative group" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`cursor-pointer relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                      isActive || hoveredIndex === i ? "text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-neon/20 rounded-full border border-neon/50 shadow-[0_0_15px_rgba(208,0,255,0.3)] -z-10 animate-in fade-in zoom-in-95 duration-200" />
                    )}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    className={`cursor-pointer relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                      isActive || hoveredIndex === i ? "text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-neon/20 rounded-full border border-neon/50 shadow-[0_0_15px_rgba(208,0,255,0.3)] -z-10 animate-in fade-in zoom-in-95 duration-200" />
                    )}
                    {item.label}
                    {item.items && <ChevronDown size={14} className={`transition-transform duration-300 ${hoveredIndex === i ? "rotate-180 text-neon" : "text-gray-600"}`} />}
                  </button>
                )}

                {/* Dropdown Menu */}
                {item.items && (
                  <div
                    className={`absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pt-2 w-64 transition-all duration-200 ${
                      hoveredIndex === i ? "opacity-100 translate-y-0 visible" : "opacity-0 translate-y-2 invisible"
                    }`}
                  >
                    <div className="bg-[#0a0a0a] border border-white/10 p-2 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
                      {/* Neon Decoration Line */}
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon to-transparent" />

                      <div className="flex flex-col gap-1">
                        {item.items.map((subItem, j) => {
                          const isSubActive = subItem.href === pathname;
                          const commonClass = `flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group/item transition-colors ${isSubActive ? "bg-white/10" : ""}`;
                          const content = (
                            <>
                              <div
                                className={`p-2 rounded-lg transition-colors text-gray-500 ${isSubActive ? "text-neon bg-neon/20" : "bg-white/5 group-hover/item:bg-neon/20 group-hover/item:text-neon"}`}
                              >
                                {subItem.icon && <subItem.icon size={16} />}
                              </div>
                              <div>
                                <div className={`text-sm font-bold font-rajdhani ${isSubActive ? "text-white" : "text-gray-200 group-hover/item:text-white"}`}>{subItem.label}</div>
                                <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider group-hover/item:text-neon/70">{subItem.desc}</div>
                              </div>
                            </>
                          );

                          return subItem.href ? (
                            <Link key={j} href={subItem.href} className={commonClass}>
                              {content}
                            </Link>
                          ) : (
                            <div key={j} className={commonClass}>
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-6 z-50">
          <WalletButton variant="nav" />
        </div>
      </div>
    </nav>
  );
};
