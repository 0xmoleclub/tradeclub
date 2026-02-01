import React from "react";

interface RowProps {
  price: number;
  size: number;
  total: number;
  type: "ask" | "bid";
}

const Row = ({ price, size, total, type }: RowProps) => (
  <div className="flex justify-between text-[10px] font-mono py-0.5 relative group hover:bg-white/5 cursor-pointer">
    <div className={`absolute top-0 ${type === "ask" ? "right-0 bg-magenta-500/10" : "right-0 bg-cyan-500/10"} h-full transition-all duration-300`} style={{ width: `${Math.random() * 100}%` }} />
    <span className={`relative z-10 w-1/3 text-left pl-2 ${type === "ask" ? "text-magenta-400" : "text-cyan-400"}`}>{price.toFixed(1)}</span>
    <span className="relative z-10 w-1/3 text-right text-gray-400">{size.toFixed(3)}</span>
    <span className="relative z-10 w-1/3 text-right pr-2 text-gray-500">{total.toFixed(3)}</span>
  </div>
);

export const OrderBook = () => {
  const asks = Array.from({ length: 12 }, (_, i) => ({ price: 98420 + i * 5, size: Math.random() * 2, total: Math.random() * 10 }));
  const bids = Array.from({ length: 12 }, (_, i) => ({ price: 98419 - i * 5, size: Math.random() * 2, total: Math.random() * 10 }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between px-2 py-2 border-b border-white/10 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      <div className="flex-1 overflow-y-hidden relative">
        <div className="flex flex-col justify-end h-1/2 pb-1 border-b border-white/5">
          {asks
            .slice()
            .reverse()
            .map((a, i) => (
              <Row key={i} {...a} type="ask" />
            ))}
        </div>
        <div className="text-center py-2 font-mono font-bold text-white text-sm bg-white/5">
          98,420.00 <span className="text-[10px] text-gray-400">USD</span>
        </div>
        <div className="h-1/2 pt-1">
          {bids.map((b, i) => (
            <Row key={i} {...b} type="bid" />
          ))}
        </div>
      </div>
    </div>
  );
};
