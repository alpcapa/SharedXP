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

const DEFAULT_PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80";

const getSafeImageSource = (imageSource, fallbackImageSource) => {
  if (typeof imageSource !== "string") {
    return fallbackImageSource;
  }

  try {
    const parsedImageSource = new URL(imageSource.trim());
    return parsedImageSource.protocol === "https:" || parsedImageSource.protocol === "http:"
      ? parsedImageSource.href
      : fallbackImageSource;
  } catch (error) {
    return fallbackImageSource;
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read selected image."));
    reader.readAsDataURL(file);
  });

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
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setFormValues(getInitialFormValues(currentUser));
    setSelectedPhotoFile(null);
    setSelectedPhotoPreviewUrl("");
    setErrorMessage("");
    setSuccessMessage("");
  }, [currentUser]);

  useEffect(
    () => () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
      }
    },
    [selectedPhotoPreviewUrl]
  );

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

  const profilePhoto =
    selectedPhotoPreviewUrl ||
    getSafeImageSource(formValues.photo || currentUser.photo, DEFAULT_PROFILE_PHOTO);

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

    const isSupportedImageType = /^image\/(png|jpe?g|gif|webp|bmp)$/i.test(selectedFile.type);
    if (!isSupportedImageType) {
      setSuccessMessage("");
      setErrorMessage("Please upload a PNG, JPG, GIF, WEBP, or BMP image.");
      return;
    }

    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl);
    }

    setSelectedPhotoFile(selectedFile);
    setSelectedPhotoPreviewUrl(URL.createObjectURL(selectedFile));
    setErrorMessage("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const userConfirmedChanges = window.confirm(
      "Are you sure you want to save these profile changes?"
    );
    if (!userConfirmedChanges) {
      return;
    }

    let nextPhoto = formValues.photo;
    if (selectedPhotoFile) {
      try {
        nextPhoto = await fileToDataUrl(selectedPhotoFile);
      } catch (error) {
        setSuccessMessage("");
        setErrorMessage("Could not read the selected photo. Please try again.");
        return;
      }
    }

    const profilePayload = {
      email: formValues.email.trim().toLowerCase(),
      phone: formValues.phone.trim(),
      country: formValues.country.trim(),
      city: formValues.city.trim(),
      address: [formValues.addressLine1.trim(), formValues.addressLine2.trim()]
        .filter(Boolean)
        .join(", "),
      photo: nextPhoto,
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
        "Critical information changed. Please log in again with your updated credentials."
      );
      navigate("/login");
      return;
    }

    setFormValues((previousValues) => ({
      ...previousValues,
      email: profilePayload.email
    }));
    setSuccessMessage("Your profile has been updated.");
    setSelectedPhotoFile(null);
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
                src={profilePhoto}
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
