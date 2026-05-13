import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || !type) {
      setError("Invalid confirmation link.");
      return;
    }

    if (type === "recovery") {
      const params = new URLSearchParams({
        token_hash: tokenHash,
        type,
      });
      navigate(`/reset-password?${params.toString()}`, { replace: true });
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
        } else {
          navigate("/", { replace: true });
        }
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <div style={{ background: "#fff", borderRadius: 8, padding: "40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "#1a1a1a", marginBottom: 12 }}>Confirmation failed</h2>
          <p style={{ color: "#666", marginBottom: 24 }}>{error}</p>
          <a href="/signup" style={{ color: "#1a1a1a", fontWeight: 600 }}>Back to sign up</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <p style={{ color: "#444", fontSize: 16 }}>Confirming your email…</p>
      </div>
    </div>
  );
}
