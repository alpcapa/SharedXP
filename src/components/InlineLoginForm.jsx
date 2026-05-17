import { useState } from "react";
import { Link } from "react-router-dom";

const InlineLoginForm = ({ onEmailLogin, title, description }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
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
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="il-password">Password</label>
        <input
          id="il-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="inline-login-alt">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
};

export default InlineLoginForm;
