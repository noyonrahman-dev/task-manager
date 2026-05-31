import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * 512x512 PWA icon — required for high-density Android launchers and the
 * Chrome install card. Served at `/icon-512.png`.
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
          fontSize: 350,
          fontWeight: 700,
          letterSpacing: -16,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: 512, height: 512 },
  );
}
