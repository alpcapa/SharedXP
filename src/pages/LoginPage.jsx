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
            <p>Log in with your email account.</p>

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
