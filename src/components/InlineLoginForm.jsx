import { useState } from "react";
import { Link } from "react-router-dom";

const InlineLoginForm = ({ onEmailLogin, onForgotPassword, title, description }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);

    if (resetMode) {
      try {
        const result = await onForgotPassword?.(email);
        if (result?.success) {
          setResetMessage("Reset link sent! Check your email (and spam folder).");
        } else {
          setError(typeof result?.message === "string" ? result.message : "Couldn't send reset link. Please try again.");
        }
      } catch {
        setResetMessage("Reset link sent! Check your email (and spam folder).");
      }
      setLoading(false);
      return;
    }

    try {
      const result = await onEmailLogin?.(email, password);
      if (result?.error) setError(result.error.message ?? "Login failed. Please try again.");
    } catch {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="inline-login-wrap">
      <h1>{title ?? "Please log in"}</h1>
      {description && <p className="inline-login-desc">{description}</p>}
      <form className="auth-form inline-login-form" onSubmit={handleSubmit}>
        <label htmlFor="il-email">Email</label>
        <input
          id="il-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); setResetMessage(""); }}
          required
        />
        {!resetMode && (
          <>
            <label htmlFor="il-password">Password</label>
            <input
              id="il-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              required
            />
          </>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {resetMessage && <p className="auth-success" role="status">{resetMessage}</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? (resetMode ? "Sending…" : "Logging in…") : (resetMode ? "Send reset link" : "Log in")}
        </button>
      </form>
      <div className="inline-login-footer">
        <button
          type="button"
          className="auth-text-link"
          onClick={() => { setResetMode((m) => !m); setError(""); setResetMessage(""); }}
        >
          {resetMode ? "Back to log in" : "Forgot password?"}
        </button>
        <p className="inline-login-alt">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default InlineLoginForm;
