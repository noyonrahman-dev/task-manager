"use client";

import * as React from "react";
import { Download, Plus, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/lib/pwa/hooks";

/**
 * Lightweight UA sniff for iOS Safari. iPad on iPadOS 13+ reports as
 * "MacIntel" but exposes `maxTouchPoints > 1` — so we look for both.
 * Used to gate the iOS install dialog. Not security-sensitive.
 */
function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIPhoneOrIPod = /iphone|ipod/i.test(ua);
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIPhoneOrIPod || isIPadOS;
}

/**
 * Header-mounted "Install" affordance.
 *
 *   • Hidden when the app is already running standalone (PWA installed).
 *   • On Chrome / Edge / Android: triggers the native install prompt.
 *   • On iOS Safari: opens a small how-to dialog (no native prompt is
 *     exposed by Apple).
 */
export function InstallButton() {
  const { canInstall, prompt, isStandalone } = useInstallPrompt();
  const [iosOpen, setIosOpen] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    await prompt();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="hidden sm:inline-flex"
        aria-label="Install Stride"
      >
        <Download className="size-4" />
        Install
      </Button>
      {/* Compact icon-only variant on small screens */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="sm:hidden"
        aria-label="Install Stride"
      >
        <Download className="size-4" />
      </Button>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install Stride on your iPhone or iPad</DialogTitle>
            <DialogDescription>
              Safari doesn&apos;t expose a one-tap install button, so the
              process takes two steps.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                1
              </span>
              <span className="flex-1">
                Tap the <Share className="mx-1 inline-block size-4 align-text-bottom" /> Share
                icon at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                2
              </span>
              <span className="flex-1">
                Choose <strong>Add to Home Screen</strong>{" "}
                <Plus className="mx-1 inline-block size-4 align-text-bottom" />.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                3
              </span>
              <span className="flex-1">
                Confirm with <strong>Add</strong>. Stride will launch as a
                standalone app from your home screen.
              </span>
            </li>
          </ol>
          <DialogFooter>
            <Button onClick={() => setIosOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
