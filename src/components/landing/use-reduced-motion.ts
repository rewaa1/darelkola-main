"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Reading matchMedia during the first client render would disagree with the
// server's HTML and trip hydration. Instead the first render always matches the
// server, and a layout effect corrects it before the browser paints — so a
// reduced-motion visitor never sees a frame of the entrance.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const media = window.matchMedia(QUERY);
    setReduced(media.matches);

    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
