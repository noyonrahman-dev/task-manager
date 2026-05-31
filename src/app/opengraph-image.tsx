import { ImageResponse } from "next/og";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const runtime = "edge";
export const alt = `${APP_NAME} — ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0a0a0c",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          backgroundImage:
            "radial-gradient(60% 50% at 100% 0%, rgba(139,92,246,0.35) 0%, transparent 60%), radial-gradient(50% 50% at 0% 100%, rgba(99,102,241,0.30) 0%, transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>{APP_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            {APP_TAGLINE}.
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)", maxWidth: 900 }}>
            A minimal, modern personal task manager built for developers.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: 22,
          }}
        >
          <span>Open source · MIT</span>
          <span>Built with Next.js</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
