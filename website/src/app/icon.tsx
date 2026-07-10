import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111421" }}>
      <div style={{ position: "relative", display: "flex", width: 250, height: 250 }}>
        <div style={{ position: "absolute", left: 34, top: 12, width: 150, height: 220, border: "18px solid #8d7df3", borderRadius: "50%", transform: "rotate(32deg)" }} />
        <div style={{ position: "absolute", right: 34, top: 12, width: 150, height: 220, border: "18px solid #ef875b", borderRadius: "50%", transform: "rotate(-32deg)" }} />
      </div>
    </div>,
    size,
  );
}
