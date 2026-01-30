"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "#fafafa" }}>
      <div style={{ maxWidth: "28rem", width: "100%", padding: "1.5rem", background: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "0.875rem" }}>
          We encountered an unexpected error. Your data is safe.
        </p>
        {process.env.NODE_ENV === "development" && error?.message && (
          <pre style={{ fontSize: "0.75rem", background: "#f3f4f6", padding: "0.75rem", borderRadius: "0.25rem", overflow: "auto", marginBottom: "1rem" }}>
            {error.message}
          </pre>
        )}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ padding: "0.5rem 1rem", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.375rem", textDecoration: "none", fontSize: "0.875rem" }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
