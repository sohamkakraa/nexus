import { ImageResponse } from "next/og";

export const alt = "Nexus — Two AI models. One considered answer.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: "62px 70px", color: "#111421", background: "#f8fafc" }}>
      <div style={{ position: "absolute", right: -70, top: -100, width: 610, height: 610, display: "flex", border: "2px solid rgba(105,88,232,.25)", borderRadius: "50%", transform: "rotate(22deg)" }} />
      <div style={{ position: "absolute", right: 40, top: -120, width: 450, height: 660, display: "flex", border: "2px solid rgba(239,135,91,.25)", borderRadius: "50%", transform: "rotate(-28deg)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 700 }}>
        <div style={{ position: "relative", display: "flex", width: 52, height: 52 }}>
          <div style={{ position: "absolute", left: 5, top: 2, width: 32, height: 46, border: "4px solid #6958e8", borderRadius: "50%", transform: "rotate(32deg)" }} />
          <div style={{ position: "absolute", right: 5, top: 2, width: 32, height: 46, border: "4px solid #ef875b", borderRadius: "50%", transform: "rotate(-32deg)" }} />
        </div>
        Nexus
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 850 }}>
        <div style={{ marginBottom: 18, color: "#6958e8", fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Open source · local first · macOS</div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "serif", fontSize: 82, lineHeight: .95, letterSpacing: -4 }}>
          <span>Don&apos;t ask one AI.</span>
          <span>Convene a council.</span>
        </div>
        <div style={{ marginTop: 24, color: "#666b7a", fontSize: 24 }}>Independent drafts. Concrete critique. One considered answer.</div>
      </div>
    </div>,
    size,
  );
}
