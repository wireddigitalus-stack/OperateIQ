"use client";

import { Zap } from "lucide-react";

interface LeaseBotTriggerProps {
  propertyName: string;
  variant?: "card" | "detail"; // card = compact chip, detail = wider inline button
}

export default function LeaseBotTrigger({
  propertyName,
  variant = "card",
}: LeaseBotTriggerProps) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("open-lease-bot", {
        detail: { propertyName },
      })
    );
  };

  if (variant === "detail") {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] text-[#FACC15] text-sm font-semibold hover:bg-[rgba(250,204,21,0.08)] hover:border-[rgba(250,204,21,0.45)] transition-all group"
        aria-label={`Ask VISION about ${propertyName}`}
      >
        <Zap size={13} className="group-hover:scale-110 transition-transform" />
        Ask VISION about this property
        <span className="text-[#FACC15]/50 group-hover:text-[#FACC15] transition-colors text-xs">→</span>
      </button>
    );
  }

  // Compact ghost chip for listing cards
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-[11px] text-[#FACC15]/70 hover:text-[#FACC15] transition-colors group border-t border-[rgba(255,255,255,0.05)] pt-3 mt-1 w-full"
      aria-label={`Ask VISION about ${propertyName}`}
    >
      <Zap size={10} className="group-hover:scale-110 transition-transform flex-shrink-0" />
      <span>Ask VISION about this property</span>
      <span className="ml-auto text-[#FACC15]/40 group-hover:text-[#FACC15]/70 transition-colors">→</span>
    </button>
  );
}
