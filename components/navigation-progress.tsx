"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Thin progress bar at the top when the route has changed.
 * Pairs with loading.tsx: user sees skeleton during load, then this bar briefly on arrival.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="nav-progress-bar"
      role="progressbar"
      aria-hidden="true"
    />
  );
}
