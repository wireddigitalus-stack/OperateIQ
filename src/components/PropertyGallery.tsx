"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Building2, Expand } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  heroImage?: string;
  propertyName: string;
  badge?: string;
  badgeColorClass?: string;
  status?: string;
}

export default function PropertyGallery({
  images,
  heroImage,
  propertyName,
  badge,
  badgeColorClass = "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]",
  status,
}: PropertyGalleryProps) {
  // Build the ordered array: hero first, then the rest deduplicated
  const allImages = React.useMemo(() => {
    if (!images || images.length === 0) return heroImage ? [heroImage] : [];
    const hero = heroImage || images[0];
    const rest = images.filter((img) => img !== hero);
    return [hero, ...rest];
  }, [images, heroImage]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const totalImages = allImages.length;
  const hasMultiple = totalImages > 1;

  const goTo = useCallback(
    (idx: number) => {
      const clamped = ((idx % totalImages) + totalImages) % totalImages;
      setActiveIdx(clamped);
      // Scroll active thumb into view
      setTimeout(() => {
        const strip = thumbStripRef.current;
        if (!strip) return;
        const thumb = strip.children[clamped] as HTMLElement;
        if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 50);
    },
    [totalImages]
  );

  const prev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo]);
  const next = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo]);

  // Keyboard navigation when lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, prev, next]);

  // Touch swipe handlers
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(false);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStart === null) return;
    if (Math.abs(e.touches[0].clientX - touchStart) > 8) setIsDragging(true);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev();
    }
    setTouchStart(null);
    setIsDragging(false);
  }

  const activeImage = allImages[activeIdx];

  if (totalImages === 0) {
    return (
      <div className="relative h-72 lg:h-[480px] rounded-2xl overflow-hidden bg-[#111827] flex items-center justify-center">
        <Building2 size={64} className="text-[rgba(74,222,128,0.1)]" />
        {(badge || status) && (
          <div className="absolute top-4 left-4 flex gap-2">
            {badge && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${badgeColorClass}`}>
                {badge}
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                {status}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Main Hero ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <div
          className="relative h-72 sm:h-[400px] lg:h-[520px] rounded-2xl overflow-hidden bg-[#111827] select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Hero image with cross-fade transition */}
          {allImages.map((img, i) => (
            <div
              key={img + i}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: i === activeIdx ? 1 : 0, pointerEvents: i === activeIdx ? "auto" : "none" }}
            >
              <Image
                src={img}
                alt={`${propertyName} — photo ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 85vw, 70vw"
              />
            </div>
          ))}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {badge && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm ${badgeColorClass}`}>
                {badge}
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                {status}
              </span>
            )}
          </div>

          {/* Expand / lightbox trigger */}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
            aria-label="View fullscreen"
          >
            <Expand size={15} />
          </button>

          {/* Nav arrows — only when multiple images */}
          {hasMultiple && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all hover:scale-110"
                aria-label="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all hover:scale-110"
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Photo counter pill */}
          {hasMultiple && (
            <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-bold text-white tabular-nums">
              {activeIdx + 1} / {totalImages}
            </div>
          )}

          {/* Mobile swipe dots */}
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 lg:hidden">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIdx
                      ? "w-5 h-2 bg-[#4ADE80]"
                      : "w-2 h-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Thumbnail Strip (desktop) ──────────────────────────────────── */}
        {hasMultiple && (
          <div
            ref={thumbStripRef}
            className="hidden lg:flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {allImages.map((img, i) => (
              <button
                key={img + i}
                onClick={() => goTo(i)}
                className={`relative flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                  i === activeIdx
                    ? "border-[#4ADE80] scale-105 shadow-lg shadow-[rgba(74,222,128,0.25)]"
                    : "border-transparent opacity-60 hover:opacity-90 hover:border-[rgba(74,222,128,0.4)]"
                }`}
                aria-label={`View photo ${i + 1}`}
              >
                <Image
                  src={img}
                  alt={`${propertyName} thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                {i === activeIdx && (
                  <div className="absolute inset-0 bg-[rgba(74,222,128,0.08)] pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white text-3xl leading-none font-thin transition-colors z-10"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            ×
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold tabular-nums z-10">
            {activeIdx + 1} / {totalImages}
          </div>

          {/* Image */}
          <div
            className="relative w-full max-w-5xl mx-6"
            style={{ aspectRatio: "16/10" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={propertyName}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Nav */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Thumb dots in lightbox */}
          {hasMultiple && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); goTo(i); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIdx
                      ? "w-6 h-2 bg-[#4ADE80]"
                      : "w-2 h-2 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
