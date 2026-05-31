import * as React from "react";

import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGAttributes<SVGElement> {
  withWordmark?: boolean;
}

/**
 * Stride logomark — a forward-leaning "S" inscribed in a rounded square.
 * The two strokes evoke a checkmark + an arrow, signalling completed work
 * driving forward momentum.
 */
export function Logo({ className, withWordmark = false, ...props }: LogoProps) {
  if (withWordmark) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Mark className="size-7" {...props} />
        <span className="text-lg font-semibold tracking-tight">Stride</span>
      </span>
    );
  }
  return <Mark className={cn("size-7", className)} {...props} />;
}

function Mark(props: React.SVGAttributes<SVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Stride logo"
      {...props}
    >
      <defs>
        <linearGradient id="stride-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#stride-grad)" />
      <path
        d="M9 19.5l4.2 3.5L23 11.5"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 13.5l3-3"
        fill="none"
        stroke="white"
        strokeOpacity="0.6"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
