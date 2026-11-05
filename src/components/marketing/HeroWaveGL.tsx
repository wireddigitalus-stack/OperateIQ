"use client";

import React, { useEffect, useRef } from "react";

/**
 * HeroWaveGL — GPU-rendered spectral data wave for the platform homepage hero.
 *
 * All wave math runs in a WebGL vertex shader; per frame the CPU only updates a
 * handful of uniforms (time, mouse, viewport). Three draw calls render the
 * streamlines, the left-side lattice ribs, and the glowing nodes; a fourth draws
 * ambient dust motes. Additive blending happens inside WebGL, so no CSS
 * blend modes or masks force the browser to re-composite the hero every frame.
 */

interface HeroWaveGLProps {
  className?: string;
  /** Overall brightness multiplier (0–1.5). */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
}

// ── Shared GLSL: spectral palette (cyan → violet → magenta → gold) ──────────
const SPECTRAL_GLSL = `
vec3 spectral(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.000, 0.706, 1.000);
  vec3 c1 = vec3(0.486, 0.227, 0.929);
  vec3 c2 = vec3(0.882, 0.294, 0.863);
  vec3 c3 = vec3(0.988, 0.827, 0.302);
  if (t < 0.32) return mix(c0, c1, t / 0.32);
  if (t < 0.65) return mix(c1, c2, (t - 0.32) / 0.33);
  return mix(c2, c3, (t - 0.65) / 0.35);
}
`;

// ── Wave program ────────────────────────────────────────────────────────────
// u_mode: 0 = streamlines, 1 = nodes (points), 2 = lattice ribs
const WAVE_VS = `
precision highp float;
attribute vec2 a_uv;
attribute float a_rand;
uniform float u_time;
uniform float u_aspect;
uniform float u_xScale;
uniform float u_dpr;
uniform float u_pointBase;
uniform float u_mode;
uniform vec2  u_mouse;
uniform float u_mouseInf;
varying vec3  v_color;
varying float v_alpha;
varying float v_bokeh;
varying float v_crest;
${SPECTRAL_GLSL}
void main() {
  float u = a_uv.x;
  float v = a_uv.y;
  float t = u_time;

  // Three rolling swells (left, center, right) + travelling harmonics + ribbon twist
  float swell = exp(-pow((u - 0.22) * 5.0, 2.0)) * 0.90
              + exp(-pow((u - 0.56) * 4.2, 2.0)) * 1.00
              + exp(-pow((u - 0.88) * 4.6, 2.0)) * 0.85;
  float h = swell * (0.75 + 0.25 * sin(t + u * 2.0)) * 0.38
          + sin(u * 5.8 - t * 1.2 + v * 1.4) * 0.12
          + cos(u * 3.2 + t * 0.8 - v * 2.2) * 0.08
          + sin(u * 8.0 - v * 4.0 + t * 1.6) * 0.025
          + sin(u * 3.4 - t * 0.9) * (v - 0.5) * 0.16;

  // Interactive ripple
  float d = distance(vec2(u, v), u_mouse);
  h += sin(d * 12.0 - t * 3.8) * exp(-d * 3.5) * 0.10 * u_mouseInf;

  // World space → perspective projection (camera at origin looking +z).
  // Back rows are widened so the ribbon sweeps edge-to-edge instead of converging into a dome.
  float x = (u - 0.5) * 3.4 * u_xScale * (1.0 + v * 1.6);
  float z = 1.15 + v * 3.4;
  float y = -0.72 + h + v * 0.18;
  float f = 2.0;
  vec2 clip = vec2(x * f / (z * u_aspect), y * f / z + 0.12);
  gl_Position = vec4(clip, 0.0, 1.0);

  float edgeU = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.88, u);
  float edgeV = smoothstep(0.0, 0.05, v) * smoothstep(1.0, 0.72, v);
  float depthFade = clamp(1.7 / z, 0.28, 1.0);
  // Keep the headline / paragraph zone (upper-middle of the screen) clean and readable
  float textSafe = 1.0 - 0.75 * smoothstep(-0.08, 0.22, clip.y);
  float a = edgeU * edgeV * depthFade * textSafe;

  v_color = spectral(u);
  v_crest = smoothstep(0.24, 0.45, h);
  v_bokeh = 0.0;
  v_alpha = 0.0;

  if (u_mode < 0.5) {
    v_alpha = a * 0.40 * (1.0 + v_crest * 0.7);
  } else if (u_mode < 1.5) {
    float show = min(1.0, step(a_rand, 0.30) + v_crest * step(a_rand, 0.70));
    float bokeh = smoothstep(1.8, 1.2, z) * (1.0 - smoothstep(0.35, 0.55, u));
    float size = u_pointBase * f / z * (1.0 + v_crest * 0.6);
    size = mix(size, size * 5.0, bokeh);
    gl_PointSize = size * u_dpr * show;
    v_bokeh = bokeh;
    v_alpha = a * show * mix(1.0, 0.5, bokeh);
  } else {
    v_alpha = a * 0.30 * (1.0 - smoothstep(0.05, 0.5, u));
  }
}
`;

const WAVE_FS = `
precision mediump float;
uniform highp float u_mode;
uniform float u_intensity;
varying vec3  v_color;
varying float v_alpha;
varying float v_bokeh;
varying float v_crest;
void main() {
  float a = v_alpha;
  vec3 col = v_color;
  if (u_mode > 0.5 && u_mode < 1.5) {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float core = exp(-d * 14.0);
    float glow = exp(-d * 3.5) * 0.55;
    float sharp = core + glow;
    float soft = (1.0 - smoothstep(0.55, 1.0, d)) * 0.5;
    col = mix(col, vec3(1.0), core * (0.35 + v_crest * 0.65) * (1.0 - v_bokeh));
    a *= mix(sharp, soft, v_bokeh);
  }
  a = clamp(a * u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a); // premultiplied → additive blend
}
`;

// ── Dust program (ambient bokeh specks in the upper atmosphere) ─────────────
const DUST_VS = `
precision highp float;
attribute vec4 a_m; // x, y, size, phase
uniform float u_time;
uniform float u_dpr;
varying vec3  v_color;
varying float v_alpha;
${SPECTRAL_GLSL}
void main() {
  float y = fract(a_m.y + u_time * 0.010 * (0.5 + a_m.w));
  gl_Position = vec4(a_m.x * 2.0 - 1.0, 0.05 + y * 0.95, 0.0, 1.0);
  gl_PointSize = a_m.z * u_dpr;
  float twinkle = 0.55 + 0.45 * sin(u_time * 1.5 + a_m.w * 6.2831);
  v_alpha = twinkle * 0.45 * smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.8, y);
  v_color = spectral(a_m.x);
}
`;

const DUST_FS = `
precision mediump float;
uniform float u_intensity;
varying vec3  v_color;
varying float v_alpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = clamp(exp(-d * 4.0) * v_alpha * u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(v_color * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[HeroWaveGL] shader error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function link(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn("[HeroWaveGL] link error:", gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

export default function HeroWaveGL({ className = "", intensity = 1.0, speed = 1.0 }: HeroWaveGLProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) return; // No WebGL → hero simply shows photos + scrims

    const waveProg = link(gl, WAVE_VS, WAVE_FS);
    const dustProg = link(gl, DUST_VS, DUST_FS);
    if (!waveProg || !dustProg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    // ── Geometry (built once per density tier) ──
    const waveBuf = gl.createBuffer();
    const lineIdx = gl.createBuffer();
    const ribIdx = gl.createBuffer();
    const dustBuf = gl.createBuffer();
    let vertCount = 0;
    let lineCount = 0;
    let ribCount = 0;
    let builtTier = "";

    const buildGeometry = (mobile: boolean) => {
      const tier = mobile ? "m" : "d";
      if (tier === builtTier) return;
      builtTier = tier;

      const rows = mobile ? 20 : 34;
      const cols = mobile ? 90 : 150;
      const verts = new Float32Array(rows * cols * 3);
      let k = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          verts[k++] = c / (cols - 1);
          verts[k++] = r / (rows - 1);
          verts[k++] = Math.random();
        }
      }
      vertCount = rows * cols;

      const lines: number[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) lines.push(r * cols + c, r * cols + c + 1);
      }
      const ribs: number[] = [];
      const ribStep = mobile ? 4 : 3;
      for (let c = 0; c < Math.floor(cols * 0.5); c += ribStep) {
        for (let r = 0; r < rows - 1; r++) ribs.push(r * cols + c, (r + 1) * cols + c);
      }
      lineCount = lines.length;
      ribCount = ribs.length;

      gl.bindBuffer(gl.ARRAY_BUFFER, waveBuf);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIdx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lines), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ribIdx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ribs), gl.STATIC_DRAW);
    };

    const DUST_COUNT = 60;
    const dust = new Float32Array(DUST_COUNT * 4);
    for (let i = 0; i < DUST_COUNT; i++) {
      dust[i * 4] = Math.random();
      dust[i * 4 + 1] = Math.random();
      dust[i * 4 + 2] = 2 + Math.random() * 4;
      dust[i * 4 + 3] = Math.random();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dust, gl.STATIC_DRAW);

    // ── Locations ──
    const W = {
      uv: gl.getAttribLocation(waveProg, "a_uv"),
      rand: gl.getAttribLocation(waveProg, "a_rand"),
      time: gl.getUniformLocation(waveProg, "u_time"),
      aspect: gl.getUniformLocation(waveProg, "u_aspect"),
      xScale: gl.getUniformLocation(waveProg, "u_xScale"),
      dpr: gl.getUniformLocation(waveProg, "u_dpr"),
      pointBase: gl.getUniformLocation(waveProg, "u_pointBase"),
      mode: gl.getUniformLocation(waveProg, "u_mode"),
      mouse: gl.getUniformLocation(waveProg, "u_mouse"),
      mouseInf: gl.getUniformLocation(waveProg, "u_mouseInf"),
      intensity: gl.getUniformLocation(waveProg, "u_intensity"),
    };
    const D = {
      m: gl.getAttribLocation(dustProg, "a_m"),
      time: gl.getUniformLocation(dustProg, "u_time"),
      dpr: gl.getUniformLocation(dustProg, "u_dpr"),
      intensity: gl.getUniformLocation(dustProg, "u_intensity"),
    };

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive glow (colors are premultiplied)
    gl.clearColor(0, 0, 0, 0);

    // ── Sizing & adaptive quality ──
    let width = 0;
    let height = 0;
    let isMobile = false;
    let dprCap = 1.5;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      isMobile = width < 768;
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : dprCap);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      buildGeometry(isMobile);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Mouse (desktop only) ──
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, inf: 0, active: false };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      mouse.tx = nx;
      mouse.ty = Math.min(1, Math.max(0, 1.25 - ny * 1.4));
      mouse.active = ny >= 0 && ny <= 1;
    };
    const onLeave = () => (mouse.active = false);
    if (!coarsePointer && !reducedMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave, { passive: true });
    }

    // ── Visibility gating ──
    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.01 });
    io.observe(canvas);

    let raf = 0;
    let running = false;
    let last = 0;
    let time = 2.0;
    let slowFrames = 0;
    let lost = false;

    const draw = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Wave program
      gl.useProgram(waveProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, waveBuf);
      gl.enableVertexAttribArray(W.uv);
      gl.vertexAttribPointer(W.uv, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(W.rand);
      gl.vertexAttribPointer(W.rand, 1, gl.FLOAT, false, 12, 8);

      const aspect = width / height;
      gl.uniform1f(W.time, time);
      gl.uniform1f(W.aspect, aspect);
      gl.uniform1f(W.xScale, aspect < 1 ? Math.max(0.45, aspect * 0.9) : 1.0);
      gl.uniform1f(W.dpr, dpr);
      gl.uniform1f(W.pointBase, isMobile ? 2.2 : 2.6);
      gl.uniform2f(W.mouse, mouse.x, mouse.y);
      gl.uniform1f(W.mouseInf, mouse.inf);
      gl.uniform1f(W.intensity, intensity);

      gl.uniform1f(W.mode, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ribIdx);
      gl.drawElements(gl.LINES, ribCount, gl.UNSIGNED_SHORT, 0);

      gl.uniform1f(W.mode, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIdx);
      gl.drawElements(gl.LINES, lineCount, gl.UNSIGNED_SHORT, 0);

      gl.uniform1f(W.mode, 1);
      gl.drawArrays(gl.POINTS, 0, vertCount);

      gl.disableVertexAttribArray(W.uv);
      gl.disableVertexAttribArray(W.rand);

      // Dust program
      gl.useProgram(dustProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
      gl.enableVertexAttribArray(D.m);
      gl.vertexAttribPointer(D.m, 4, gl.FLOAT, false, 0, 0);
      gl.uniform1f(D.time, time);
      gl.uniform1f(D.dpr, dpr);
      gl.uniform1f(D.intensity, intensity);
      gl.drawArrays(gl.POINTS, 0, DUST_COUNT);
      gl.disableVertexAttribArray(D.m);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (lost || !onScreen || document.hidden) {
        last = now;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      time += dt * 0.85 * speed;

      // Adaptive quality: drop resolution if frames are consistently slow
      if (dt > 0.022) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 60 && dprCap > 1) {
        dprCap = 1;
        slowFrames = 0;
        resize();
      }

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      mouse.inf += ((mouse.active ? 1 : 0) - mouse.inf) * 0.04;

      draw();
    };

    const start = () => {
      if (running || lost) return;
      running = true;
      canvas.style.opacity = "1";
      if (reducedMotion) {
        draw(); // single static frame
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    // Defer until the browser is idle so the first hero photo (LCP) paints first
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(start, { timeout: 900 });
    else timeoutId = setTimeout(start, 300);

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      if (idleId !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [intensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      style={{ opacity: 0, transition: "opacity 1.4s ease-out" }}
    />
  );
}
