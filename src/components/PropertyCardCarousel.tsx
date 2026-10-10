"use client";
import React, { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
}

export default function PropertyCardCarousel({ images, alt }: Props) {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const total = images.length;
  const hasMulti = total > 1;

  const go = useCallback((i: number) => setIdx(((i % total) + total) % total), [total]);

  return (
    <div
      className="relative w-full h-full select-none group/carousel"
      onTouchStart={e => setTouchX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX === null) return;
        const d = touchX - e.changedTouches[0].clientX;
        if (Math.abs(d) > 40) d > 0 ? go(idx + 1) : go(idx - 1);
        setTouchX(null);
      }}
    >
      {/* Images with crossfade */}
      {images.map((src, i) => (
        <div
          key={src + i}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? "auto" : "none" }}
        >
          <Image
            src={src}
            alt={`${alt} — photo ${i + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Arrows */}
      {hasMulti && (
        <>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); go(idx - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); go(idx + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Next"
          >
            <ChevronRight size={14} />
          </button>
        </>
      )}

      {/* Dots */}
      {hasMulti && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.preventDefault(); e.stopPropagation(); go(i); }}
              className={`rounded-full transition-all duration-300 ${
                i === idx ? "w-4 h-1.5 bg-[#4ADE80]" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter pill */}
      {hasMulti && (
        <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white tabular-nums">
          {idx + 1}/{total}
        </div>
      )}
    </div>
  );
}
