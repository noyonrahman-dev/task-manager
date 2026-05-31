import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * 512x512 maskable PWA icon. Android adaptive icons mask the source down
 * to the launcher's mask shape (circle, squircle, rounded square, …) and
 * crop the outer ~10%. The Web App Manifest spec recommends keeping the
 * "safe zone" centered with the brand mark inside an 80% circle.
 *
 * We render the brand on an edge-to-edge background and shrink the glyph
 * so it always sits inside the safe zone, regardless of the launcher mask.
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
          fontSize: 240,
          fontWeight: 700,
          letterSpacing: -10,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: 512, height: 512 },
  );
}
