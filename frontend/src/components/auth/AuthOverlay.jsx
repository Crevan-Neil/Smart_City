// ─────────────────────────────────────────────
//  components/auth/AuthOverlay.jsx
//  Glassmorphism Login/Register overlay
// ─────────────────────────────────────────────

import { useState } from "react";
import useAuthStore from "../../store/authStore";

export default function AuthOverlay() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    identifier: "",
  });
  const [loading, setLoading] = useState(false);

  const { login, register, error, clearError } = useAuthStore();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let success = false;
    if (isLogin) {
      success = await login(formData.identifier, formData.password);
    } else {
      success = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at center, rgba(6,18,30,0.8), #06121e)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.5s ease-out",
      }}
    >
      <div
        style={{
          width: 400,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 229, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#00e5ff",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            ◈ CITY TWIN
          </div>
          <div style={{ fontSize: 12, color: "#4a7a9b", fontFamily: "monospace" }}>
            {isLogin ? "AUTHENTICATION REQUIRED" : "CREATE NEW ACCOUNT"}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && (
            <InputGroup
              label="USERNAME"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Your city handle"
            />
          )}
          
          {isLogin ? (
            <InputGroup
              label="IDENTIFIER"
              name="identifier"
              type="text"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Username or email"
            />
          ) : (
            <InputGroup
              label="EMAIL ADDRESS"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@campus.edu"
            />
          )}

          <InputGroup
            label="PASSWORD"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          {error && (
            <div
              style={{
                fontSize: 11,
                color: "#ff4d4d",
                background: "rgba(255, 77, 77, 0.1)",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255, 77, 77, 0.2)",
                fontFamily: "monospace",
              }}
            >
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 12,
              padding: "14px 0",
              background: loading ? "rgba(0, 229, 255, 0.1)" : "rgba(0, 229, 255, 0.15)",
              border: `1px solid ${loading ? "rgba(0, 229, 255, 0.2)" : "rgba(0, 229, 255, 0.4)"}`,
              borderRadius: 12,
              color: "#00e5ff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.1em",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(0, 229, 255, 0.25)";
                e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.6)";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(0, 229, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.4)";
              }
            }}
          >
            {loading ? "PROCESSING..." : isLogin ? "ACCESS SYSTEM" : "INITIALIZE ACCOUNT"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={toggleMode}
            style={{
              background: "none",
              border: "none",
              color: "#4a7a9b",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            {isLogin ? "Don't have access? Register" : "Already registered? Login"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function InputGroup({ label, name, type, value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 9,
          color: "#4a7a9b",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          marginLeft: 4,
        }}
      >
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 10,
          padding: "12px 16px",
          color: "#e2f4ff",
          fontSize: 13,
          outline: "none",
          transition: "all 0.2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.4)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }}
      />
    </div>
  );
}
