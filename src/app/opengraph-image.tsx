import { ImageResponse } from "next/og";

export const alt = "Panta Lens, prediction market intelligence";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#090a0a",
        color: "#ede9df",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "68px 76px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: "20px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: "38px",
            position: "relative",
            width: "72px",
          }}
        >
          <div
            style={{
              background: "#75d2ae",
              height: "2px",
              left: "0",
              position: "absolute",
              width: "36px",
            }}
          />
          <div
            style={{
              background: "#2f3532",
              height: "2px",
              position: "absolute",
              right: "0",
              width: "36px",
            }}
          />
          <div
            style={{
              background: "#090a0a",
              border: "2px solid #75d2ae",
              borderRadius: "50%",
              height: "30px",
              left: "21px",
              position: "absolute",
              width: "30px",
            }}
          />
          <div
            style={{
              background: "#75d2ae",
              borderRadius: "50%",
              height: "8px",
              left: "32px",
              position: "absolute",
              width: "8px",
            }}
          />
        </div>
        <span
          style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-1.2px" }}
        >
          Panta Lens
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <span
          style={{
            fontSize: "76px",
            fontWeight: 700,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          Prediction market intelligence
        </span>
        <span style={{ color: "#b8b5ad", fontSize: "28px", lineHeight: 1.3 }}>
          Read-only market context from Panta.
        </span>
      </div>

      <div
        style={{
          alignItems: "center",
          borderTop: "1px solid #2f3532",
          color: "#b8b5ad",
          display: "flex",
          fontSize: "20px",
          justifyContent: "space-between",
          paddingTop: "24px",
        }}
      >
        <span>Prices · lifecycle · activity</span>
        <span style={{ color: "#75d2ae" }}>PANTA</span>
      </div>
    </div>,
    size,
  );
}
