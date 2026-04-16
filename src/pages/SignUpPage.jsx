import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const COUNTRY_OPTIONS = [
  { name: "Portugal", code: "PT", dialCode: "+351" },
  { name: "Spain", code: "ES", dialCode: "+34" },
  { name: "France", code: "FR", dialCode: "+33" },
  { name: "Germany", code: "DE", dialCode: "+49" },
  { name: "United Kingdom", code: "GB", dialCode: "+44" },
  { name: "United States", code: "US", dialCode: "+1" },
  { name: "Canada", code: "CA", dialCode: "+1" },
  { name: "Brazil", code: "BR", dialCode: "+55" },
  { name: "India", code: "IN", dialCode: "+91" },
  { name: "Japan", code: "JP", dialCode: "+81" }
];

const SignUpPage = ({ currentUser, onLogout, onEmailSignUp, onSocialLogin }) => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "Portugal",
    phone: "",
    address: "",
    photo: ""
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);
  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find(
        (countryOption) =>
          countryOption.name.toLowerCase() === formValues.country.trim().toLowerCase()
      ),
    [formValues.country]
  );

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

    if (!selectedCountry) {
      setErrorMessage("Please select a valid country from the list.");
      return;
    }

    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const phoneDigitsOnly = formValues.phone.replace(/\D/g, "");
    const dialCodeDigits = selectedCountry.dialCode.replace(/\D/g, "");
    const localPhoneDigits = phoneDigitsOnly.startsWith(dialCodeDigits)
      ? phoneDigitsOnly.slice(dialCodeDigits.length)
      : phoneDigitsOnly;

    setErrorMessage("");
    setPendingVerification({
      firstName,
      lastName,
      fullName,
      email: formValues.email.trim().toLowerCase(),
      password: formValues.password,
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      countryDialCode: selectedCountry.dialCode,
      phone: `${selectedCountry.dialCode} ${localPhoneDigits}`.trim(),
      address: formValues.address.trim(),
      photo: formValues.photo
    });
  };

  const completeEmailVerification = async () => {
    if (!pendingVerification) {
      return;
    }

    try {
      await onEmailSignUp?.(pendingVerification);
      navigate("/");
    } catch (error) {
      setErrorMessage("We could not complete signup. Please try again.");
    }
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
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formValues.firstName}
                  onChange={onInputChange}
                />

                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formValues.lastName}
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
                  minLength={8}
                  required
                  value={formValues.password}
                  onChange={onInputChange}
                />

                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  required
                  value={formValues.confirmPassword}
                  onChange={onInputChange}
                />

                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  required
                  value={formValues.address}
                  onChange={onInputChange}
                />

                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  name="country"
                  list="country-list"
                  required
                  value={formValues.country}
                  onChange={onInputChange}
                />
                <datalist id="country-list">
                  {COUNTRY_OPTIONS.map((countryOption) => (
                    <option key={countryOption.code} value={countryOption.name}>
                      {countryOption.dialCode}
                    </option>
                  ))}
                </datalist>

                <label htmlFor="phone">Phone</label>
                <div className="auth-phone-field">
                  <span className="auth-phone-code">
                    {selectedCountry?.dialCode ?? "—"}
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formValues.phone}
                    onChange={onInputChange}
                  />
                </div>

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
                {errorMessage && <p className="auth-error">{errorMessage}</p>}
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
