import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 38, background: "#111421" }}>
      <div style={{ position: "relative", display: "flex", width: 100, height: 108 }}>
        <div style={{ position: "absolute", left: 13, top: 5, width: 60, height: 94, border: "8px solid #8d7df3", borderRadius: "50%", transform: "rotate(32deg)" }} />
        <div style={{ position: "absolute", right: 13, top: 5, width: 60, height: 94, border: "8px solid #ef875b", borderRadius: "50%", transform: "rotate(-32deg)" }} />
      </div>
    </div>,
    size,
  );
}
