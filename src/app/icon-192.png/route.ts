import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * 192x192 PWA icon — required for Android home-screen install. Served at
 * `/icon-192.png`. Generated dynamically so the gradient stays in sync
 * with the rest of the brand (`src/components/logo.tsx`).
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          color: "white",
          fontSize: 130,
          fontWeight: 700,
          letterSpacing: -6,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: 192, height: 192 },
  );
}
