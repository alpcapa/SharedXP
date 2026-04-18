import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const LoginPage = ({ currentUser, onLogout, onEmailLogin, onSocialLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const destination = location.state?.from?.pathname ?? "/";

  const onSubmit = async (event) => {
    event.preventDefault();
    const loginResult = await onEmailLogin?.(email, password);

    if (!loginResult?.success) {
      setErrorMessage(loginResult?.message ?? "Unable to login.");
      return;
    }

    setErrorMessage("");
    navigate(destination);
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section auth-page">
          <section className="auth-card">
            <h1>Log in</h1>
            <p>Continue with Google, Apple, or your email account.</p>

            <div className="auth-social-grid">
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  onSocialLogin?.("google");
                  navigate(destination);
                }}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  onSocialLogin?.("apple");
                  navigate(destination);
                }}
              >
                Continue with Apple
              </button>
            </div>

            <div className="auth-divider">
              <span>or continue with email</span>
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {errorMessage && <p className="auth-error">{errorMessage}</p>}
              <button type="submit" className="btn btn-primary auth-submit">
                Log in
              </button>
            </form>

            <p className="auth-footnote">
              Need an account? <Link to="/signup">Sign up</Link>
            </p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default LoginPage;
