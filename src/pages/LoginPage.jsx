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
    let loginResult;
    try {
      loginResult = await onEmailLogin?.(email, password);
    } catch (e) {
      console.error("onEmailLogin error:", e);
      setErrorMessage("Login failed. Please try again.");
      return;
    }

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
          <section className="auth-content">
            <h1>Log in</h1>
            <p>Continue with Google, Apple, or your email account.</p>

            <div className="auth-social-grid">
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  if (destination && destination !== "/") {
                    sessionStorage.setItem("postAuthRedirect", destination);
                  }
                  onSocialLogin?.("google");
                }}
              >
                <svg className="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  if (destination && destination !== "/") {
                    sessionStorage.setItem("postAuthRedirect", destination);
                  }
                  onSocialLogin?.("apple");
                }}
              >
                <svg className="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.18.8 1.21-.24 2.37-.93 3.67-.84 1.55.12 2.72.72 3.47 1.84-3.18 1.86-2.43 5.98.48 7.13-.57 1.39-1.32 2.76-2.8 3.95zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
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
