"use client";

import React, { useEffect, useRef, useState } from "react";

interface InteractiveMarqueeProps {
  children: React.ReactNode;
  speedPxPerSec?: number; // Default left-to-right auto-slide speed
}

export default function InteractiveMarquee({
  children,
  speedPxPerSec = 95,
}: InteractiveMarqueeProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const lastClientXRef = useRef<number>(0);
  const wheelPauseUntilRef = useRef<number>(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const wrapOffset = (val: number, halfWidth: number): number => {
    if (halfWidth <= 0) return val;
    // Wrap seamlessly into [-halfWidth, 0)
    return ((((val % halfWidth) + halfWidth) % halfWidth) - halfWidth);
  };

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const track = trackRef.current;
      if (track) {
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
          if (!initializedRef.current) {
            offsetRef.current = -halfWidth;
            initializedRef.current = true;
          }

          if (!isDraggingRef.current && now > wheelPauseUntilRef.current) {
            // Automatic continuous Left-to-Right motion
            offsetRef.current += speedPxPerSec * dt;
          }

          offsetRef.current = wrapOffset(offsetRef.current, halfWidth);
          track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [speedPxPerSec]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    setIsGrabbing(true);
    lastClientXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastClientXRef.current;
    lastClientXRef.current = e.clientX;

    const track = trackRef.current;
    if (track) {
      const halfWidth = track.scrollWidth / 2;
      offsetRef.current = wrapOffset(offsetRef.current + deltaX, halfWidth);
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsGrabbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Allow horizontal trackpad swipe or Shift+Wheel to scroll left/right
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? -e.deltaX : 0;
    if (delta === 0) return;

    const track = trackRef.current;
    if (track) {
      const halfWidth = track.scrollWidth / 2;
      wheelPauseUntilRef.current = performance.now() + 300;
      offsetRef.current = wrapOffset(offsetRef.current + delta, halfWidth);
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onWheel={handleWheel}
      style={{
        cursor: isGrabbing ? "grabbing" : "grab",
        touchAction: "pan-y",
      }}
      className="relative w-full overflow-hidden select-none"
    >
      <div
        ref={trackRef}
        style={{ display: "flex", width: "max-content", willChange: "transform" }}
      >
        {/* First set */}
        <div className="flex items-center">{children}</div>
        {/* Second duplicate set for seamless bidirectional infinite loop */}
        <div className="flex items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

