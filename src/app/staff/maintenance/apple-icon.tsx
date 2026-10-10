import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "radial-gradient(circle at 50% 55%, #3D2D00 0%, #1A1200 60%, #080600 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 100, lineHeight: 1 }}>🔨</div>
    </div>,
    { ...size }
  );
}
