"use client";

import React, { useEffect, useRef } from "react";

interface HeroDataWaveProps {
  className?: string;
  opacity?: number;
  speed?: number;
  interactive?: boolean;
}

// Deterministic pseudorandom hash to stably assign colors to specific grid nodes
function nodeHash(r: number, c: number): number {
  let h = r * 374761393 + c * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

export default function HeroDataWave({
  className = "",
  opacity = 0.85,
  speed = 1.0,
  interactive = true,
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

    // Mouse tracking for subtle 3D tilt and wave disturbance
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

      // Normalize mouse to [-1, 1] relative to the hero canvas
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

    // Handle canvas resizing with Device Pixel Ratio cap for silky 60fps performance
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

    // Pause rendering when hero is scrolled out of viewport (0% battery drain)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(canvas);

    // Traveling telemetry packet streams
    interface Packet {
      col: number;
      rowProgress: number; // 0 to rows-1
      speed: number;
      color: string;
      glowColor: string;
      size: number;
    }

    const packets: Packet[] = [
      { col: 8, rowProgress: 2, speed: 0.08, color: "#38BDF8", glowColor: "rgba(56,189,248,0.8)", size: 3.5 },
      { col: 16, rowProgress: 8, speed: 0.11, color: "#34D399", glowColor: "rgba(52,211,153,0.8)", size: 4 },
      { col: 24, rowProgress: 14, speed: 0.07, color: "#A855F7", glowColor: "rgba(168,85,247,0.8)", size: 3.5 },
      { col: 32, rowProgress: 5, speed: 0.09, color: "#F59E0B", glowColor: "rgba(245,158,11,0.8)", size: 4 },
      { col: 40, rowProgress: 18, speed: 0.12, color: "#38BDF8", glowColor: "rgba(56,189,248,0.8)", size: 3.5 },
    ];

    let time = 0;

    // Render Loop
    const render = () => {
      if (!isVisible || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.018 * speed;

      // Smooth mouse interpolation (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;
      mouse.influence += ((mouse.active ? 1 : 0) - mouse.influence) * 0.04;

      // Clear canvas with transparent clear
      ctx.clearRect(0, 0, width, height);

      // Adaptive grid density based on screen size
      const isMobile = width < 768;
      const cols = isMobile ? 26 : 46;
      const rows = isMobile ? 18 : 28;

      // Camera & Perspective settings
      // Horizon sits in the upper-middle of hero, tilting down into foreground
      const fov = 380;
      const cameraPitch = 0.44 + mouse.y * 0.06;
      const cameraYaw = mouse.x * 0.08;
      const originX = width * 0.5;
      const originY = height * 0.58;

      // Pre-compute 3D grid points
      interface ProjectedPoint {
        screenX: number;
        screenY: number;
        elevation: number;
        depthScale: number;
        alpha: number;
        specialType: "white" | "emerald" | "purple" | "amber";
        pulse: number;
      }

      const grid: ProjectedPoint[][] = [];

      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        const v = r / (rows - 1); // 0 (near horizon) to 1 (foreground)

        for (let c = 0; c < cols; c++) {
          const u = (c / (cols - 1)) * 2 - 1; // -1 to +1

          // World 3D coordinates
          // Expand wider in foreground for dramatic perspective spread
          const worldX = u * (width * 0.85 + v * width * 0.55);
          const worldZ = 120 + (1 - v) * 520; // 120 (close) to 640 (far)

          // Multi-harmonic sine wave synthesis
          const w1 = Math.sin(u * 3.8 + time * 1.3) * Math.cos(v * 2.8 - time * 0.9) * 36;
          const w2 = Math.sin((u * 2.4 + v * 3.2) - time * 1.6) * 20;
          const w3 = Math.cos(u * 5.2 - time * 0.7) * 8;

          // Interactive mouse wave disturbance
          const distToMouse = Math.sqrt((u - mouse.x * 0.8) ** 2 + ((1 - v) - (mouse.y * 0.5 + 0.5)) ** 2);
          const mouseWave =
            Math.sin(distToMouse * 10 - time * 4.0) *
            Math.exp(-distToMouse * 3.2) *
            42 *
            mouse.influence;

          // Composite elevation: subtle ramp sloping up towards back + undulating waves
          const elevation = (w1 + w2 + w3 + mouseWave) * (0.6 + v * 0.6);
          const worldY = -elevation + (1 - v) * 45; // Negative Y is up in 3D

          // 3D Perspective Projection with Camera Tilt
          // Rotate around X (pitch) and Y (yaw)
          const cosPitch = Math.cos(cameraPitch);
          const sinPitch = Math.sin(cameraPitch);
          const cosYaw = Math.cos(cameraYaw);
          const sinYaw = Math.sin(cameraYaw);

          // Yaw rotation
          const rotX = worldX * cosYaw - worldZ * sinYaw;
          const tempZ = worldX * sinYaw + worldZ * cosYaw;

          // Pitch rotation
          const rotY = worldY * cosPitch - tempZ * sinPitch;
          const rotZ = worldY * sinPitch + tempZ * cosPitch;

          // Perspective divide
          const depthScale = fov / Math.max(rotZ, 20);
          const screenX = originX + rotX * depthScale;
          const screenY = originY + rotY * depthScale;

          // Fade out near edges and distant horizon
          const edgeFadeX = Math.cos(u * Math.PI * 0.5);
          const edgeFadeZ = Math.sin(v * Math.PI);
          const alpha = Math.max(0, Math.min(1, edgeFadeX * edgeFadeZ * 1.35)) * opacity;

          // Deterministic node classification for color sparks
          const hash = nodeHash(r, c);
          let specialType: "white" | "emerald" | "purple" | "amber" = "white";
          if (hash % 100 < 5) specialType = "emerald"; // Cashflow green
          else if (hash % 100 < 10) specialType = "purple"; // AI intelligence purple
          else if (hash % 100 < 14) specialType = "amber"; // Telemetry amber

          // Pulse glow cycle for dots
          const pulse = Math.sin(time * 3 + hash * 0.05) * 0.5 + 0.5;

          grid[r][c] = {
            screenX,
            screenY,
            elevation,
            depthScale,
            alpha,
            specialType,
            pulse,
          };
        }
      }

      // ── Step 1: Draw Longitudinal Lines (running back to front) ──
      ctx.save();
      ctx.globalCompositeOperation = "screen"; // Additive glow without blowout

      for (let c = 0; c < cols; c++) {
        // Skip some lines on mobile for cleaner look
        if (isMobile && c % 2 !== 0) continue;

        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const pt = grid[r][c];
          if (r === 0) ctx.moveTo(pt.screenX, pt.screenY);
          else ctx.lineTo(pt.screenX, pt.screenY);
        }

        // Mid-column sample to set line alpha and gradient
        const midPt = grid[Math.floor(rows / 2)][c];
        const lineAlpha = midPt.alpha * 0.45;

        if (lineAlpha > 0.02) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`; // Electric Cyan
          ctx.lineWidth = Math.max(0.8, midPt.depthScale * 0.9);
          ctx.stroke();
        }
      }

      // ── Step 2: Draw Latitudinal Cross-Lines (flowing across the width) ──
      for (let r = 0; r < rows; r++) {
        const rowSample = grid[r][Math.floor(cols / 2)];
        const rowAlpha = rowSample.alpha;

        if (rowAlpha < 0.02) continue;

        // Dynamic gradient for each cross-wave: deep cobalt -> electric cyan -> azure -> deep cobalt
        const pStart = grid[r][0];
        const pEnd = grid[r][cols - 1];
        const grad = ctx.createLinearGradient(pStart.screenX, pStart.screenY, pEnd.screenX, pEnd.screenY);

        grad.addColorStop(0, `rgba(30, 58, 138, 0)`);
        grad.addColorStop(0.2, `rgba(37, 99, 235, ${rowAlpha * 0.35})`);
        grad.addColorStop(0.5, `rgba(56, 189, 248, ${rowAlpha * 0.75})`);
        grad.addColorStop(0.8, `rgba(37, 99, 235, ${rowAlpha * 0.35})`);
        grad.addColorStop(1, `rgba(30, 58, 138, 0)`);

        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const pt = grid[r][c];
          if (c === 0) ctx.moveTo(pt.screenX, pt.screenY);
          else ctx.lineTo(pt.screenX, pt.screenY);
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, rowSample.depthScale * 1.25);
        ctx.stroke();
      }

      // ── Step 3: Draw Telemetry Node Dots & Colored Beacons ──
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = grid[r][c];
          if (pt.alpha < 0.08) continue;

          // Render only a balanced distribution of dots to keep it crisp & sophisticated
          const isNode = (r % 2 === 0 && c % 2 === 0) || pt.specialType !== "white";
          if (!isNode) continue;

          const baseRadius = Math.max(1.2, pt.depthScale * 1.5);
          let dotRadius = baseRadius;
          let fill = `rgba(255, 255, 255, ${pt.alpha * 0.95})`;
          let glow = `rgba(56, 189, 248, ${pt.alpha * 0.5})`;

          if (pt.specialType === "emerald") {
            // Cashflow beacon (Emerald #34D399)
            dotRadius = baseRadius * (1.3 + pt.pulse * 0.5);
            fill = `rgba(52, 211, 153, ${pt.alpha * 0.95})`;
            glow = `rgba(52, 211, 153, ${pt.alpha * (0.4 + pt.pulse * 0.4)})`;
          } else if (pt.specialType === "purple") {
            // AI intelligence beacon (Violet #A855F7)
            dotRadius = baseRadius * (1.3 + pt.pulse * 0.4);
            fill = `rgba(168, 85, 247, ${pt.alpha * 0.95})`;
            glow = `rgba(168, 85, 247, ${pt.alpha * (0.4 + pt.pulse * 0.4)})`;
          } else if (pt.specialType === "amber") {
            // Sensor alert beacon (Amber #F59E0B)
            dotRadius = baseRadius * (1.3 + pt.pulse * 0.45);
            fill = `rgba(245, 158, 11, ${pt.alpha * 0.95})`;
            glow = `rgba(245, 158, 11, ${pt.alpha * (0.4 + pt.pulse * 0.4)})`;
          } else {
            // Standard White/Cyan core spark on high crests
            if (pt.elevation > 12) {
              dotRadius = baseRadius * 1.2;
              fill = `rgba(255, 255, 255, ${pt.alpha * 0.98})`;
            }
          }

          // Outer luminous glow
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, dotRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Crisp core point
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
        }
      }

      // ── Step 4: Traveling Data Packets ──
      for (const pkt of packets) {
        pkt.rowProgress += pkt.speed;
        if (pkt.rowProgress >= rows - 1) {
          pkt.rowProgress = 1;
        }

        const r0 = Math.floor(pkt.rowProgress);
        const r1 = Math.min(rows - 1, r0 + 1);
        const frac = pkt.rowProgress - r0;
        const colIdx = Math.min(cols - 1, pkt.col);

        const pt0 = grid[r0][colIdx];
        const pt1 = grid[r1][colIdx];

        if (!pt0 || !pt1 || pt0.alpha < 0.1) continue;

        // Interpolate along line segment
        const px = pt0.screenX + (pt1.screenX - pt0.screenX) * frac;
        const py = pt0.screenY + (pt1.screenY - pt0.screenY) * frac;
        const pRadius = pkt.size * (pt0.depthScale * 0.85);

        // Glow trail
        ctx.beginPath();
        ctx.arc(px, py, pRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = pkt.glowColor;
        ctx.fill();

        // White-hot core
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
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
        // Smooth radial edge vignette so data grid dissolves seamlessly into banner photos
        maskImage:
          "radial-gradient(ellipse 90% 85% at 50% 55%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.4) 75%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 85% at 50% 55%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.4) 75%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block transform-gpu will-change-transform"
        style={{
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
