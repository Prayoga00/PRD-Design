'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface GlassOrbProps {
  sizeClassName?: string;
  orbRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 145u square orb layer with -30.5u margin (84u layout footprint),
 * radial mask (61% -> 76%) melting black into #0E0E0E,
 * still plate underneath and a 4s crossfading swirling canvas animation on top
 * that respects prefers-reduced-motion.
 */
const ORB_PLATE_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/images/glass-orb-plate.jpg`;

export function GlassOrb({ sizeClassName, orbRef }: GlassOrbProps) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;
    const img = new Image();
    img.src = ORB_PLATE_SRC;

    img.onload = () => {
      if (cancelled) return;
      const size = 360;
      canvas.width = size;
      canvas.height = size;
      const half = size / 2;
      const coreRadius = size * 0.295;
      const orbRadius = size * 0.375;

      const start = performance.now();
      let revealed = false;

      const drawFrame = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const t = (elapsed % 4000) / 4000;
        const twoPi = Math.PI * 2;

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        // Seamless 4s crossfaded swirling core: phaseA & phaseB offset by 0.5
        const pulseScale = 1 + 0.04 * Math.sin(t * twoPi);
        const pulseAlpha = 0.45 + 0.2 * (0.5 - 0.5 * Math.cos(t * twoPi));

        const drawCoreLayer = (phase: number, weight: number) => {
          if (weight <= 0.01) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(half, half, coreRadius, 0, twoPi);
          ctx.clip();

          const angle = (phase - 0.5) * Math.PI * 1.1;
          const localScale = pulseScale * (0.96 + 0.07 * Math.sin(phase * Math.PI));
          ctx.translate(half, half);
          ctx.rotate(angle);
          ctx.scale(localScale, localScale);
          ctx.translate(-half, -half);
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = weight * pulseAlpha;
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();
        };

        const phaseA = t;
        const phaseB = (t + 0.5) % 1;
        const weightA = Math.sin(phaseA * Math.PI);
        const weightB = Math.sin(phaseB * Math.PI);
        const norm = Math.max(0.001, weightA + weightB);

        drawCoreLayer(phaseA, weightA / norm);
        drawCoreLayer(phaseB, weightB / norm);

        // Refracted electric-blue / violet light caustic moving inside glass shell
        const shimmerAngle = t * twoPi;
        const sx = half + Math.cos(shimmerAngle) * orbRadius * 0.26;
        const sy = half + Math.sin(shimmerAngle) * orbRadius * 0.26;
        ctx.save();
        ctx.beginPath();
        ctx.arc(half, half, orbRadius, 0, twoPi);
        ctx.clip();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, orbRadius * 0.9);
        grad.addColorStop(0, 'rgba(72, 140, 255, 0.26)');
        grad.addColorStop(0.55, 'rgba(90, 76, 245, 0.14)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();

        if (!revealed) {
          revealed = true;
          setMotionReady(true);
        }

        rafId = window.requestAnimationFrame(drawFrame);
      };

      rafId = window.requestAnimationFrame(drawFrame);
    };

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={orbRef}
      aria-hidden="true"
      style={
        sizeClassName
          ? undefined
          : {
              width: 'calc(145 * var(--u))',
              height: 'calc(145 * var(--u))',
              margin: 'calc(-30.5 * var(--u))',
            }
      }
      className={`iris-orb-mask relative shrink-0 select-none pointer-events-none ${sizeClassName ?? ''}`}
    >
      {/* Still plate always present underneath */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ORB_PLATE_SRC}
        alt=""
        width={360}
        height={360}
        decoding="async"
        className="h-full w-full rounded-full object-cover"
      />

      {/* Animated looping core layer fading in when ready (skipped on reduced motion) */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full rounded-full transition-opacity duration-500 ${
            motionReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
