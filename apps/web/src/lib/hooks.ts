"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

let industriesCache: Promise<Record<string, string>> | null = null;

export function useIndustries(): Record<string, string> {
  const [industries, setIndustries] = useState<Record<string, string>>({});
  useEffect(() => {
    industriesCache ??= api.industries().catch((err) => {
      industriesCache = null;
      throw err;
    });
    industriesCache.then(setIndustries).catch(() => {});
  }, []);
  return industries;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Liczy od 0 do celu przy pierwszym pojawieniu się liczby; kolejne zmiany ustawia od razu.
export function useCountUp(target: number | undefined, duration = 1100): number {
  const [value, setValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (target === undefined) return;
    if (animated.current || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    animated.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
