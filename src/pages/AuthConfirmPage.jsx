import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isResetPasswordRedirectUrl } from "../utils/recoveryLink";

export default function AuthConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const redirectTo = searchParams.get("redirect_to");
    const shouldTreatAsRecovery =
      type === "recovery" ||
      isResetPasswordRedirectUrl(redirectTo);

    if (!tokenHash || !type) {
      setError("Invalid confirmation link.");
      return;
    }

    if (shouldTreatAsRecovery) {
      const params = new URLSearchParams({
        token_hash: tokenHash,
        type: "recovery",
      });
      navigate(`/reset-password?${params.toString()}`, { replace: true });
      return;
    }

    const isEmailChange =
      type === "email_change" ||
      type === "email_change_new" ||
      type === "email_change_current";

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(async ({ data, error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
        if (isEmailChange) {
          const newEmail = data?.user?.email;
          const userId = data?.user?.id;
          if (newEmail && userId) {
            await supabase
              .from("profiles")
              .update({ email: newEmail, updated_at: new Date().toISOString() })
              .eq("id", userId);
          }
          await supabase.auth.signOut();
          navigate("/login", { replace: true, state: { emailUpdated: true } });
          return;
        }
        navigate("/", { replace: true });
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
