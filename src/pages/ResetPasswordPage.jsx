import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { supabase } from "../lib/supabase";

const ResetPasswordPage = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const tokenParams = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenHash = queryParams.get("token_hash");
    const type = queryParams.get("type");
    if (tokenHash && type === "recovery") {
      return { tokenHash, type };
    }

    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    if (hashParams.get("type") === "recovery") {
      return { tokenHash: null, type: "recovery" };
    }

    return null;
  }, [location.hash, location.search]);

  useEffect(() => {
    let isMounted = true;

    const verifyRecovery = async () => {
      if (!tokenParams) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage("Invalid or expired password reset link.");
        }
        return;
      }

      if (!tokenParams.tokenHash) {
        if (isMounted) setStatus("ready");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenParams.tokenHash,
        type: "recovery",
      });

      if (!isMounted) return;
      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Invalid or expired password reset link.");
        return;
      }
      setStatus("ready");
    };

    verifyRecovery();
    return () => {
      isMounted = false;
    };
  }, [tokenParams]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setErrorMessage(error.message || "Couldn't update password. Please try again.");
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("[reset-password] signOut:", signOutError);
    }

    setErrorMessage("");
    setSuccessMessage(
      signOutError
        ? "Your password has been changed. Please refresh the page or log out manually, then log in with your new password."
        : "Your password has been successfully changed. You can now log in with your new password."
    );
    setStatus("success");
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section auth-page">
          <section className="auth-content">
            <h1>Reset Password</h1>
            <p>
              {status === "success"
                ? "Password reset completed."
                : "Enter your new password below."}
            </p>

            {status === "verifying" && <p>Verifying your reset link…</p>}
            {status === "error" && <p className="auth-error">{errorMessage}</p>}

            {status === "ready" && (
              <form className="auth-form" onSubmit={onSubmit}>
                <label htmlFor="new-password">Enter your new password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                />

                <label htmlFor="confirm-new-password">Re-enter your new password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                />

                {errorMessage && <p className="auth-error">{errorMessage}</p>}
                <button type="submit" className="btn btn-primary auth-submit">
                  Submit
                </button>
              </form>
            )}

            {status === "success" && (
              <>
                <p className="auth-success">{successMessage}</p>
                <p className="auth-footnote">
                  <Link to="/login">Log in</Link>
                </p>
              </>
            )}
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
