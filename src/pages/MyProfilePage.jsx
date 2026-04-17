import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const getAddressLines = (address) => {
  if (!address) {
    return {
      addressLine1: "",
      addressLine2: ""
    };
  }

  const [addressLine1 = "", ...remainingAddressParts] = address
    .split(",")
    .map((addressPart) => addressPart.trim())
    .filter(Boolean);

  return {
    addressLine1,
    addressLine2: remainingAddressParts.join(", ")
  };
};

const getInitialFormValues = (user) => {
  const { addressLine1, addressLine2 } = getAddressLines(user?.address);
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    country: user?.country ?? "",
    city: user?.city ?? "",
    addressLine1,
    addressLine2,
    photo: user?.photo ?? "",
    agreedToTermsAndConditions: Boolean(user?.agreedToTermsAndConditions),
    agreedToPromotionsAndMarketingEmails: Boolean(user?.agreedToPromotionsAndMarketingEmails)
  };
};

const MyProfilePage = ({ currentUser, onLogout, onUpdateProfile }) => {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const [formValues, setFormValues] = useState(getInitialFormValues(currentUser));
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setFormValues(getInitialFormValues(currentUser));
    setErrorMessage("");
    setSuccessMessage("");
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to see your profile.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const onInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: type === "checkbox" ? checked : value
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

  const onSubmit = async (event) => {
    event.preventDefault();

    const userConfirmedChanges = window.confirm(
      "Are you sure you want to save these profile changes?"
    );
    if (!userConfirmedChanges) {
      return;
    }

    const profilePayload = {
      email: formValues.email.trim().toLowerCase(),
      phone: formValues.phone.trim(),
      country: formValues.country.trim(),
      city: formValues.city.trim(),
      address: [formValues.addressLine1.trim(), formValues.addressLine2.trim()]
        .filter(Boolean)
        .join(", "),
      photo: formValues.photo,
      agreedToPromotionsAndMarketingEmails: formValues.agreedToPromotionsAndMarketingEmails
    };

    const saveResult = await onUpdateProfile?.(profilePayload);
    if (!saveResult?.success) {
      setSuccessMessage("");
      setErrorMessage(saveResult?.message ?? "Could not save changes. Please try again.");
      return;
    }

    setErrorMessage("");
    if (saveResult.requiresReauthentication) {
      setSuccessMessage("");
      window.alert(
        "Critical information changed. Please verify your account again by logging in with your updated information."
      );
      navigate("/login");
      return;
    }

    setSuccessMessage("Your profile has been updated.");
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page">
          <h1>My Profile</h1>
          <div className="profile-name-row">
            <h2>{currentUser.fullName}</h2>
            {currentUser.isHost && (
              <Link to="/host-settings" className="verified-host-badge">
                ✅ Verified Host
              </Link>
            )}
          </div>
          <form className="auth-form profile-form" onSubmit={onSubmit}>
            <div className="profile-photo-editor">
              <img
                src={formValues.photo || currentUser.photo}
                alt={currentUser.fullName}
                className="profile-photo-large"
              />
              <button
                type="button"
                className="profile-photo-edit-button"
                onClick={() => photoInputRef.current?.click()}
                aria-label="Edit photo"
              >
                ✏️
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="profile-photo-input"
                onChange={onPhotoSelect}
              />
            </div>

            <div className="profile-form-grid">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" type="text" value={formValues.firstName} disabled />

              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" type="text" value={formValues.lastName} disabled />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formValues.email}
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

              <label htmlFor="country">Country</label>
              <input
                id="country"
                name="country"
                type="text"
                required
                value={formValues.country}
                onChange={onInputChange}
              />

              <label htmlFor="city">City</label>
              <input id="city" name="city" type="text" required value={formValues.city} onChange={onInputChange} />

              <label htmlFor="addressLine1">Address</label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                required
                value={formValues.addressLine1}
                onChange={onInputChange}
              />

              <label htmlFor="addressLine2">Address line 2</label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                value={formValues.addressLine2}
                onChange={onInputChange}
              />
            </div>

            <div className="form-consent-group">
              <label className="form-consent-option" htmlFor="agreedToTermsAndConditions">
                <input
                  id="agreedToTermsAndConditions"
                  name="agreedToTermsAndConditions"
                  type="checkbox"
                  checked={formValues.agreedToTermsAndConditions}
                  disabled
                  onChange={onInputChange}
                />
                <span>I agree to Terms &amp; Conditions</span>
              </label>
              <label className="form-consent-option" htmlFor="agreedToPromotionsAndMarketingEmails">
                <input
                  id="agreedToPromotionsAndMarketingEmails"
                  name="agreedToPromotionsAndMarketingEmails"
                  type="checkbox"
                  checked={formValues.agreedToPromotionsAndMarketingEmails}
                  onChange={onInputChange}
                />
                <span>I agree to receive Promotions &amp; Marketing emails</span>
              </label>
            </div>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {successMessage && <p className="host-success-message">{successMessage}</p>}
            <button type="submit" className="btn btn-primary auth-submit">
              Save Changes
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default MyProfilePage;
