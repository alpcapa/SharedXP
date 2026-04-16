import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const SignUpPage = ({ currentUser, onLogout, onEmailSignUp, onSocialLogin }) => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    photo: ""
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: value
    }));
  };

  const onPhotoSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      setFormValues((previousValues) => ({
        ...previousValues,
        photo: String(fileReader.result)
      }));
    };
    fileReader.readAsDataURL(selectedFile);
  };

  const onEmailSubmit = (event) => {
    event.preventDefault();

    if (formValues.password !== formValues.confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setErrorMessage("");
    setPendingVerification({
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim().toLowerCase(),
      password: formValues.password,
      phone: formValues.phone.trim(),
      address: formValues.address.trim(),
      photo: formValues.photo
    });
  };

  const completeEmailVerification = () => {
    if (!pendingVerification) {
      return;
    }

    onEmailSignUp?.(pendingVerification);
    navigate("/");
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section auth-page">
          <section className="auth-card">
            <h1>Create your account</h1>
            <p>Sign up with Google, Apple, or email. Phone is required for all verified accounts.</p>

            <div className="auth-social-grid">
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  onSocialLogin?.("google");
                  navigate("/");
                }}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  onSocialLogin?.("apple");
                  navigate("/");
                }}
              >
                Continue with Apple
              </button>
            </div>

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>

            {!pendingVerification ? (
              <form className="auth-form" onSubmit={onEmailSubmit}>
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formValues.fullName}
                  onChange={onInputChange}
                />

                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formValues.email}
                  onChange={onInputChange}
                />

                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  value={formValues.password}
                  onChange={onInputChange}
                />

                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  required
                  value={formValues.confirmPassword}
                  onChange={onInputChange}
                />

                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formValues.phone}
                  onChange={onInputChange}
                />

                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formValues.address}
                  onChange={onInputChange}
                />

                <label htmlFor="photo">Photo</label>
                <input id="photo" name="photo" type="file" accept="image/*" onChange={onPhotoSelect} />
                {formValues.photo && (
                  <img src={formValues.photo} alt="Selected profile" className="auth-photo-preview" />
                )}

                {errorMessage && <p className="auth-error">{errorMessage}</p>}
                <button type="submit" className="btn btn-primary auth-submit">
                  Continue to email verification
                </button>
              </form>
            ) : (
              <div className="verify-card">
                <h2>Check your email</h2>
                <p>
                  We sent a confirmation email to <strong>{pendingVerification.email}</strong>.
                </p>
                <p>After confirming your email, continue below to activate your account.</p>
                <button type="button" className="btn btn-primary auth-submit" onClick={completeEmailVerification}>
                  I have confirmed my email
                </button>
              </div>
            )}

            <p className="auth-footnote">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SignUpPage;
