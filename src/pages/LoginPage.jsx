import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const LoginPage = ({
  currentUser,
  onLogout,
  onEmailLogin,
  onForgotPassword,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const resetSuccessMessage =
    "Reset link has been sent to your email. Check spam folder if not received";

  const destination = location.state?.from?.pathname ?? "/";

  const onSubmit = async (event) => {
    event.preventDefault();
    if (resetMode) {
      let resetResult;
      try {
        resetResult = await onForgotPassword(email);
      } catch (e) {
        console.error("onForgotPassword error:", e);
        setErrorMessage("");
        setResetMessage(resetSuccessMessage);
        return;
      }

      if (!resetResult?.success) {
        const resetError = typeof resetResult?.message === "string"
          ? resetResult.message
          : "";
        if (resetError) {
          setErrorMessage(resetError);
          setResetMessage("");
          return;
        }
        setErrorMessage("We couldn't send a reset link right now. Please try again.");
        setResetMessage("");
        return;
      }
      setErrorMessage("");
      setResetMessage(resetSuccessMessage);
      return;
    }

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
            <h1>{resetMode ? "Forgot Password?" : "Log in"}</h1>
            <p>
              {resetMode
                ? "Enter your email to reset your password"
                : "Log in with your email account."}
            </p>

            <form className="auth-form" onSubmit={onSubmit}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errorMessage) setErrorMessage("");
                  if (resetMessage) setResetMessage("");
                }}
              />

              {!resetMode && (
                <>
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </>
              )}

              {errorMessage && <p className="auth-error">{errorMessage}</p>}
              {resetMessage && <p className="auth-success">{resetMessage}</p>}
              <button type="submit" className="btn btn-primary auth-submit">
                {resetMode ? "Send" : "Log in"}
              </button>
            </form>

            <div className="auth-footnote auth-footnote-row">
              <button
                type="button"
                className="auth-text-link"
                onClick={() => {
                  setResetMode((prev) => !prev);
                  setErrorMessage("");
                  setResetMessage("");
                }}
              >
                {resetMode ? "Back to Log in" : "Forgot Password?"}
              </button>
              <p className="auth-footnote-signup">
                Need an account? <Link to="/signup">Sign up</Link>
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default LoginPage;
