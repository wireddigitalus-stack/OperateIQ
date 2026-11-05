"use client";

import React, { useEffect, useRef } from "react";

interface HeroDataWaveProps {
  className?: string;
  opacity?: number;
  speed?: number;
  interactive?: boolean;
  showHud?: boolean;
}

// Spectral color ramp matching the uploaded artwork:
// Left (Electric Cyan/Blue) -> Center-Left (Royal Indigo/Violet) -> Center-Right (Orchid/Magenta) -> Right (Champagne/Amber Gold)
function getSpectralRgb(u: number): { r: number; g: number; b: number } {
  // Clamp u between 0 and 1
  const t = Math.max(0, Math.min(1, u));

  let r: number, g: number, b: number;
  if (t < 0.32) {
    // 0.0 -> Electric Cyan (0, 180, 255) to 0.32 -> Deep Violet (124, 58, 237)
    const f = t / 0.32;
    r = 0 + f * 124;
    g = 180 - f * 122;
    b = 255 - f * 18;
  } else if (t < 0.65) {
    // 0.32 -> Deep Violet (124, 58, 237) to 0.65 -> Orchid Magenta (225, 75, 220)
    const f = (t - 0.32) / 0.33;
    r = 124 + f * 101;
    g = 58 + f * 17;
    b = 237 - f * 17;
  } else {
    // 0.65 -> Orchid Magenta (225, 75, 220) to 1.0 -> Warm Gold / Amber (252, 211, 77)
    const f = (t - 0.65) / 0.35;
    r = 225 + f * 27;
    g = 75 + f * 136;
    b = 220 - f * 143;
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

export default function HeroDataWave({
  className = "",
  opacity = 0.95,
  speed = 1.0,
  interactive = true,
  showHud = true,
}: HeroDataWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse tracking for subtle 3D tilt & ripple disturbance
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: false,
      influence: 0,
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const rect = canvas.getBoundingClientRect();

      mouse.targetX = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.targetY = ((clientY - rect.top) / rect.height) * 2 - 1;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
      mouse.active = false;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });

    // Handle canvas resizing with Device Pixel Ratio cap
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Pause rendering when hero is scrolled out of viewport
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(canvas);

    // Floating ambient bokeh dust motes (seen in the upper dark atmosphere of the artwork)
    interface DustMote {
      x: number;
      y: number;
      z: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      baseAlpha: number;
      color: string;
    }

    const dustMotes: DustMote[] = Array.from({ length: 36 }, () => {
      const u = Math.random();
      const rgb = getSpectralRgb(u);
      return {
        x: Math.random(),
        y: Math.random() * 0.65, // Keep mostly in upper/mid hero
        z: 0.3 + Math.random() * 0.7,
        size: 1.0 + Math.random() * 2.2,
        speedY: 0.0003 + Math.random() * 0.0005,
        speedX: (Math.random() - 0.5) * 0.0002,
        alpha: 0.15 + Math.random() * 0.5,
        baseAlpha: 0.2 + Math.random() * 0.5,
        color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      };
    });

    let time = 0;

    // ── Render Loop ─────────────────────────────────────────────────────────
    const render = () => {
      if (!isVisible || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.014 * speed;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;
      mouse.influence += ((mouse.active ? 1 : 0) - mouse.influence) * 0.04;

      // Clear frame
      ctx.clearRect(0, 0, width, height);

      // Adaptive grid density:
      // In the artwork, there are many dense horizontal streamlines and distinct cross-lines on the left.
      const isMobile = width < 768;
      const numLines = isMobile ? 22 : 36; // Horizontal streamlines across width
      const samplesPerLine = isMobile ? 55 : 85; // Resolution along the curve

      // Perspective & Camera Setup
      // Camera sits slightly elevated, angled looking down across the ribbon landscape
      const fov = 440;
      const cameraPitch = 0.34 + mouse.y * 0.05;
      const cameraYaw = mouse.x * 0.06;
      const originX = width * 0.5;
      const originY = height * 0.54;

      interface ProjectedPoint {
        screenX: number;
        screenY: number;
        z: number;
        depthScale: number;
        u: number;
        v: number;
        elevation: number;
        alpha: number;
        color: { r: number; g: number; b: number };
        isBokeh: boolean;
        bokehRadius: number;
      }

      // Pre-calculate 3D ribbon points [lineIndex][sampleIndex]
      const mesh: ProjectedPoint[][] = [];

      for (let l = 0; l < numLines; l++) {
        mesh[l] = [];
        const v = l / (numLines - 1); // 0 (front edge) to 1 (back edge)

        for (let s = 0; s < samplesPerLine; s++) {
          const u = s / (samplesPerLine - 1); // 0 (left) to 1 (right)

          // 3D coordinates in ribbon space
          // S-curve sweep across width
          const worldX = (u - 0.5) * (width * 1.35 + v * (width * 0.2));

          // Depth (Z): Front edge is close (Z ~ 120), back edge is far (Z ~ 480)
          // Plus an organic curve along the horizontal span
          const depthCurve = Math.sin(u * Math.PI) * 45;
          const worldZ = 120 + v * 360 + depthCurve;

          // ── Multi-Harmonic Wave Math (faithfully reproduces the 3 distinct swells in the artwork) ──
          // Swell 1 (Left ~0.20), Swell 2 (Center ~0.55), Swell 3 (Right ~0.85)
          const swell1 = Math.exp(-Math.pow((u - 0.22) * 5.0, 2)) * 65;
          const swell2 = Math.exp(-Math.pow((u - 0.56) * 4.2, 2)) * 75;
          const swell3 = Math.exp(-Math.pow((u - 0.88) * 4.6, 2)) * 60;
          const swells = swell1 + swell2 + swell3;

          // Dynamic wave undulations traveling along the ribbon
          const waveA = Math.sin(u * 5.8 - time * 1.2 + v * 1.4) * 28;
          const waveB = Math.cos(u * 3.2 + time * 0.8 - v * 2.2) * 18;
          const waveC = Math.sin((u * 8.0 - v * 4.0) + time * 1.6) * 8;

          // Canyon valley twist between front and back edges (creates the 3D ribbon fold)
          const twist = Math.sin(u * 3.4 - time * 0.9) * (v - 0.5) * 42;

          // Interactive mouse disturbance
          const distToMouse = Math.sqrt((u - (mouse.x * 0.45 + 0.5)) ** 2 + (v - (mouse.y * 0.4 + 0.5)) ** 2);
          const mouseWave =
            Math.sin(distToMouse * 12 - time * 3.8) *
            Math.exp(-distToMouse * 3.5) *
            40 *
            mouse.influence;

          // Composite elevation (Y is inverted: negative is upwards)
          const totalElevation = swells * (0.7 + Math.sin(time + u * 2) * 0.3) + waveA + waveB + waveC + twist + mouseWave;
          const worldY = -totalElevation + (1 - v) * 35;

          // 3D Perspective Rotation (Yaw & Pitch)
          const cosP = Math.cos(cameraPitch);
          const sinP = Math.sin(cameraPitch);
          const cosY = Math.cos(cameraYaw);
          const sinY = Math.sin(cameraYaw);

          // Yaw around Y-axis
          const rx = worldX * cosY - worldZ * sinY;
          const tz = worldX * sinY + worldZ * cosY;

          // Pitch around X-axis
          const ry = worldY * cosP - tz * sinP;
          const rz = worldY * sinP + tz * cosP;

          // Perspective scaling
          const depthScale = fov / Math.max(rz, 20);
          const screenX = originX + rx * depthScale;
          const screenY = originY + ry * depthScale;

          // Edge alpha falloff (smoothly fades out at screen borders)
          const edgeFadeX = Math.sin(u * Math.PI);
          const edgeFadeZ = Math.sin(v * Math.PI);
          const alpha = Math.max(0, Math.min(1, edgeFadeX * edgeFadeZ * 1.4)) * opacity;

          // Depth of Field (DoF):
          // In the user's artwork, the immediate foreground (bottom-left, close to camera)
          // has soft, large out-of-focus bokeh circles, while the wave crests are crisp!
          const isForeground = rz < 185 && v < 0.28 && u < 0.45;
          const bokehRadius = isForeground ? Math.max(4, (185 - rz) * 0.18) : 0;

          mesh[l][s] = {
            screenX,
            screenY,
            z: rz,
            depthScale,
            u,
            v,
            elevation: totalElevation,
            alpha,
            color: getSpectralRgb(u),
            isBokeh: isForeground,
            bokehRadius,
          };
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen"; // Additive neon blend for glowing light

      // ── Step 1: Render Atmospheric Background Dust Motes ──
      for (const mote of dustMotes) {
        mote.y -= mote.speedY;
        mote.x += mote.speedX;
        if (mote.y < 0) {
          mote.y = 0.65;
          mote.x = Math.random();
        }

        const mx = mote.x * width;
        const my = mote.y * height;
        const twinkle = Math.sin(time * 2 + mote.x * 20) * 0.3 + 0.7;
        const moteAlpha = mote.baseAlpha * twinkle * opacity;

        ctx.beginPath();
        ctx.arc(mx, my, mote.size, 0, Math.PI * 2);
        ctx.fillStyle = mote.color.replace("rgb", "rgba").replace(")", `, ${moteAlpha})`);
        ctx.fill();
      }

      // ── Step 2: Render Longitudinal Cross-Mesh Lines (The Cyan Lattice on the Left) ──
      // In the artwork, the left third has prominent cross-rib lines connecting into a grid
      const crossStep = isMobile ? 3 : 2;
      for (let s = 0; s < Math.floor(samplesPerLine * 0.55); s += crossStep) {
        const u = s / (samplesPerLine - 1);
        const crossAlphaFalloff = Math.max(0, 1 - (u / 0.45) ** 1.8); // Fades toward center

        ctx.beginPath();
        let started = false;
        for (let l = 0; l < numLines; l++) {
          const pt = mesh[l][s];
          if (!pt || pt.alpha < 0.05) continue;

          if (!started) {
            ctx.moveTo(pt.screenX, pt.screenY);
            started = true;
          } else {
            ctx.lineTo(pt.screenX, pt.screenY);
          }
        }

        if (started) {
          const samplePt = mesh[Math.floor(numLines / 2)][s];
          const lineAlpha = samplePt.alpha * crossAlphaFalloff * 0.55;
          if (lineAlpha > 0.01) {
            ctx.strokeStyle = `rgba(${samplePt.color.r}, ${samplePt.color.g}, ${samplePt.color.b}, ${lineAlpha})`;
            ctx.lineWidth = Math.max(0.7, samplePt.depthScale * 0.85);
            ctx.stroke();
          }
        }
      }

      // ── Step 3: Render Flowing Horizontal Streamlines (Dense Parallel Wave Curves) ──
      for (let l = 0; l < numLines; l++) {
        // Draw segmented line gradient to smoothly blend from Blue -> Purple -> Magenta -> Gold
        for (let s = 0; s < samplesPerLine - 1; s++) {
          const p0 = mesh[l][s];
          const p1 = mesh[l][s + 1];

          if (p0.alpha < 0.02 || p1.alpha < 0.02) continue;

          const segAlpha = ((p0.alpha + p1.alpha) * 0.5) * (0.45 + p0.v * 0.35);

          // Subtle elevation-based brightness boost for crests
          const crestBoost = Math.max(1, p0.elevation > 40 ? 1.25 : 1.0);

          ctx.beginPath();
          ctx.moveTo(p0.screenX, p0.screenY);
          ctx.lineTo(p1.screenX, p1.screenY);

          ctx.strokeStyle = `rgba(${p0.color.r}, ${p0.color.g}, ${p0.color.b}, ${segAlpha * crestBoost})`;
          ctx.lineWidth = Math.max(0.75, p0.depthScale * 1.1);
          ctx.stroke();
        }
      }

      // ── Step 4: Render Glowing Wave Nodes & Foreground Bokeh Spheres ──
      for (let l = 0; l < numLines; l++) {
        const isDenseLine = l % 2 === 0;

        for (let s = 0; s < samplesPerLine; s++) {
          const pt = mesh[l][s];
          if (pt.alpha < 0.05) continue;

          // Distinct node distribution:
          // More dots on the crests and wireframe intersections
          const isNode =
            (s % 3 === 0 && isDenseLine) ||
            (pt.u < 0.38 && s % 2 === 0 && l % 2 === 0) ||
            (pt.elevation > 50 && s % 2 === 0);

          if (!isNode) continue;

          // ── Case A: Out-of-Focus Foreground Bokeh (Bottom-Left in Artwork) ──
          if (pt.isBokeh && pt.bokehRadius > 1.5) {
            const rad = pt.bokehRadius;
            const grad = ctx.createRadialGradient(
              pt.screenX,
              pt.screenY,
              0,
              pt.screenX,
              pt.screenY,
              rad * 1.8
            );
            grad.addColorStop(0, `rgba(0, 180, 255, ${pt.alpha * 0.45})`);
            grad.addColorStop(0.6, `rgba(0, 120, 255, ${pt.alpha * 0.22})`);
            grad.addColorStop(1, "rgba(0, 60, 200, 0)");

            ctx.beginPath();
            ctx.arc(pt.screenX, pt.screenY, rad * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            continue;
          }

          // ── Case B: In-Focus Sharp Glowing Beads on Wave Contours ──
          const baseRadius = Math.max(1.1, pt.depthScale * 1.4);
          const isHighCrest = pt.elevation > 45;
          const nodeRadius = isHighCrest ? baseRadius * 1.35 : baseRadius;

          // Outer glowing halo
          const glowGrad = ctx.createRadialGradient(
            pt.screenX,
            pt.screenY,
            0,
            pt.screenX,
            pt.screenY,
            nodeRadius * 2.8
          );
          glowGrad.addColorStop(0, `rgba(${pt.color.r}, ${pt.color.g}, ${pt.color.b}, ${pt.alpha * 0.75})`);
          glowGrad.addColorStop(1, `rgba(${pt.color.r}, ${pt.color.g}, ${pt.color.b}, 0)`);

          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, nodeRadius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();

          // White-hot center core for high crest beads (matches the artwork)
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, nodeRadius * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = isHighCrest
            ? `rgba(255, 255, 255, ${pt.alpha * 0.98})`
            : `rgba(${pt.color.r}, ${pt.color.g}, ${pt.color.b}, ${pt.alpha * 0.9})`;
          ctx.fill();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("touchmove", handlePointerMove);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [opacity, speed, interactive]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-[8] ${className}`}
      style={{
        // Smooth radial edge vignette to blend seamlessly with hero background images
        maskImage:
          "radial-gradient(ellipse 95% 90% at 50% 52%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 80%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 95% 90% at 50% 52%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 80%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block transform-gpu will-change-transform"
        style={{
          mixBlendMode: "screen",
        }}
      />

      {/* ── Futuristic Telemetry Micro-HUD Stamp (faithfully matches top-left of artwork) ── */}
      {showHud && (
        <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10 pointer-events-none hidden sm:block opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="space-y-1.5 font-mono text-[9px] text-sky-400/80 tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-300">0101</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* Matrix dot cluster */}
            <div className="grid grid-cols-6 gap-1 w-fit py-0.5 opacity-70">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-0.5 h-0.5 rounded-full ${
                    i % 3 === 0 ? "bg-cyan-300" : "bg-cyan-500/40"
                  }`}
                />
              ))}
            </div>

            {/* Angled telemetry lines */}
            <div className="pt-1 flex items-center gap-2 text-[8px] text-gray-400">
              <span className="border-t border-sky-400/40 w-4 inline-block" />
              <span className="text-sky-300/80">STREAM // 04</span>
              <span>·</span>
              <span>DATA TELEMETRY</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
