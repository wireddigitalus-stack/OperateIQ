import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "radial-gradient(circle at 50% 55%, #0D3D0D 0%, #071207 60%, #030803 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 100, lineHeight: 1 }}>🧹</div>
    </div>,
    { ...size }
  );
}
