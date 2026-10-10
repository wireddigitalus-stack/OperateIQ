"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  src: string;
  alt: string;
}

interface Props {
  gallery: GalleryItem[];
}

export default function CoWorkHeroCarousel({ gallery }: Props) {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const total = gallery.length;

  const go = useCallback(
    (i: number) => setIdx(((i % total) + total) % total),
    [total]
  );

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setInterval(() => go(idx + 1), 5000);
    return () => clearInterval(timer);
  }, [idx, go]);

  return (
    <div
      className="relative h-80 lg:h-[500px] rounded-2xl overflow-hidden group/hero"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const d = touchX - e.changedTouches[0].clientX;
        if (Math.abs(d) > 40) d > 0 ? go(idx + 1) : go(idx - 1);
        setTouchX(null);
      }}
    >
      {/* Main images with crossfade */}
      {gallery.map((img, i) => (
        <div
          key={img.src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/60 via-transparent to-transparent pointer-events-none" />

      {/* Navigation arrows */}
      <button
        onClick={() => go(idx - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="Previous photo"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => go(idx + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="Next photo"
      >
        <ChevronRight size={16} />
      </button>

      {/* Thumbnail strip at the bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2">
        {gallery.map((img, i) => (
          <button
            key={img.src}
            onClick={() => go(i)}
            className={`relative flex-1 h-16 rounded-lg overflow-hidden transition-all duration-300 ${
              i === idx
                ? "ring-2 ring-[#FACC15] ring-offset-1 ring-offset-[#0D1117] scale-[1.02]"
                : "opacity-60 hover:opacity-90"
            }`}
            aria-label={`View ${img.alt}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="25vw"
            />
          </button>
        ))}
      </div>

      {/* Counter pill */}
      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[11px] font-bold text-white tabular-nums">
        {idx + 1} / {total}
      </div>
    </div>
  );
}
