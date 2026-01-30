"use client";

/**
 * Root-level error boundary. Uses only inline styles so it can render
 * even when CSS chunks fail to load. Prevents "missing required error components, refreshing..." loop.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "28rem", width: "100%", padding: "1.5rem", background: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem", color: "#111" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "0.875rem" }}>
            The app hit an error. You can try again or go home.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "0.5rem 1rem", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.375rem", textDecoration: "none", fontSize: "0.875rem" }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
