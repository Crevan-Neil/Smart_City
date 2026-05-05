// ─────────────────────────────────────────────
//  components/ErrorBoundary.jsx
//  Catches render errors inside the R3F Canvas
//  and shows a friendly fallback UI
// ─────────────────────────────────────────────

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] 3D scene crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#06121e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            fontFamily: "monospace",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 20 }}>⚠ 3D SCENE ERROR</div>
          <div style={{ fontSize: 12, color: "#7a9bb5", maxWidth: 400, textAlign: "center" }}>
            {this.state.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{
              marginTop: 8,
              padding: "6px 18px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6,
              color: "#ef4444",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
