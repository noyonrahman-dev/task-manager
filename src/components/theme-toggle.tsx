"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};
const NEXT_LABEL: Record<Theme, string> = {
  light: "Switch to dark theme",
  dark: "Switch to system theme",
  system: "Switch to light theme",
};

/**
 * Cycling theme toggle. One click advances `light → dark → system → light`.
 * The icon reflects the *current* theme, so users always see what's active
 * (not what's about to happen). Hydration-safe: shows a neutral icon until
 * the theme is read on the client.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current: Theme = mounted && isTheme(theme) ? theme : "system";
  const next = NEXT_THEME[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={NEXT_LABEL[current]}
      title={`Theme: ${current[0]?.toUpperCase()}${current.slice(1)} · click to cycle`}
    >
      {!mounted ? (
        // Render a neutral, theme-agnostic placeholder until hydration so
        // the markup matches between server and client.
        <Sun className="size-4 opacity-0" aria-hidden />
      ) : current === "light" ? (
        <Sun className="size-4" />
      ) : current === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Monitor className="size-4" />
      )}
    </Button>
  );
}

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}
