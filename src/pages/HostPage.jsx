import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const SPORT_OPTIONS = ["Cycling", "Tennis", "Running", "Football", "Surfing", "Basketball"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Flexible"];
const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const createEmptySportConfig = () => ({
  sport: "",
  description: "",
  about: "",
  pricing: "",
  level: "",
  availability: {
    days: [],
    startTime: "",
    endTime: ""
  },
  images: []
});

const inferCityFromAddress = (address) => {
  if (!address) {
    return "";
  }

  const addressParts = address
    .split(",")
    .map((addressPart) => addressPart.trim())
    .filter(Boolean);

  if (addressParts.length >= 2) {
    return addressParts[1];
  }

  return addressParts[0] ?? "";
};

const getInitialHostProfile = (user) => {
  const existingProfile = user?.hostProfile ?? {};
  const existingSports = Array.isArray(existingProfile.sports) && existingProfile.sports.length > 0
    ? existingProfile.sports.map((sportConfig) => ({
        ...createEmptySportConfig(),
        ...sportConfig,
        availability: {
          ...createEmptySportConfig().availability,
          ...(sportConfig.availability ?? {})
        },
        images: Array.isArray(sportConfig.images) ? sportConfig.images : []
      }))
    : [createEmptySportConfig()];

  return {
    country: existingProfile.country ?? user?.country ?? "",
    city:
      existingProfile.city ??
      user?.city ??
      inferCityFromAddress(user?.address) ??
      "",
    stripe: {
      stripeEmail: existingProfile.stripe?.stripeEmail ?? user?.email ?? "",
      accountHolderName: existingProfile.stripe?.accountHolderName ?? user?.fullName ?? "",
      bankName: existingProfile.stripe?.bankName ?? "",
      accountNumber: existingProfile.stripe?.accountNumber ?? "",
      routingNumber: existingProfile.stripe?.routingNumber ?? "",
      payoutCurrency: existingProfile.stripe?.payoutCurrency ?? ""
    },
    sports: existingSports
  };
};

const HostPage = ({ currentUser, onLogout, onToggleHost, onSaveHostProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHostSettingsRoute = location.pathname === "/host-settings";
  const initialProfile = useMemo(() => getInitialHostProfile(currentUser), [currentUser]);
  const [hostProfileDraft, setHostProfileDraft] = useState(initialProfile);
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setHostProfileDraft(initialProfile);
    setActiveSportIndex(0);
    setErrorMessage("");
    setSuccessMessage("");
  }, [initialProfile]);

  useEffect(() => {
    if (activeSportIndex >= hostProfileDraft.sports.length) {
      setActiveSportIndex(Math.max(0, hostProfileDraft.sports.length - 1));
    }
  }, [activeSportIndex, hostProfileDraft.sports.length]);

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in before becoming a host.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  if (!currentUser.isHost && !isHostSettingsRoute) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <h1>Become A Host</h1>
            <p>Start hosting experiences and earn from your sport expertise.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onToggleHost?.();
                navigate("/host-settings");
              }}
            >
              Activate Host Profile
            </button>
          </main>
        </div>
      </div>
    );
  }

  const activeSport = hostProfileDraft.sports[activeSportIndex] ?? createEmptySportConfig();

  const updateStripeField = (fieldName, value) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      stripe: {
        ...previousDraft.stripe,
        [fieldName]: value
      }
    }));
  };

  const updateSportField = (fieldName, value) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) =>
        index === activeSportIndex
          ? {
              ...sportConfig,
              [fieldName]: value
            }
          : sportConfig
      )
    }));
  };

  const toggleAvailabilityDay = (day) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) => {
        if (index !== activeSportIndex) {
          return sportConfig;
        }

        const currentDays = sportConfig.availability.days;
        const updatedDays = currentDays.includes(day)
          ? currentDays.filter((currentDay) => currentDay !== day)
          : [...currentDays, day];

        return {
          ...sportConfig,
          availability: {
            ...sportConfig.availability,
            days: updatedDays
          }
        };
      })
    }));
  };

  const updateAvailabilityTime = (fieldName, value) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) =>
        index === activeSportIndex
          ? {
              ...sportConfig,
              availability: {
                ...sportConfig.availability,
                [fieldName]: value
              }
            }
          : sportConfig
      )
    }));
  };

  const onSportImageSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    const imageData = await Promise.all(
      selectedFiles.map(
        (selectedFile) =>
          new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = () => resolve(String(fileReader.result));
            fileReader.readAsDataURL(selectedFile);
          })
      )
    );

    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) =>
        index === activeSportIndex
          ? {
              ...sportConfig,
              images: [...sportConfig.images, ...imageData]
            }
          : sportConfig
      )
    }));

    event.target.value = "";
  };

  const removeSportImage = (imageIndex) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) =>
        index === activeSportIndex
          ? {
              ...sportConfig,
              images: sportConfig.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex)
            }
          : sportConfig
      )
    }));
  };

  const addSport = () => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: [...previousDraft.sports, createEmptySportConfig()]
    }));
    setActiveSportIndex(hostProfileDraft.sports.length);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const validateOnboarding = () => {
    if (!hostProfileDraft.country.trim()) {
      return "Country is missing from your registration profile.";
    }

    if (!hostProfileDraft.city.trim()) {
      return "City is missing from your registration profile.";
    }

    const stripeFields = [
      hostProfileDraft.stripe.stripeEmail,
      hostProfileDraft.stripe.accountHolderName,
      hostProfileDraft.stripe.bankName,
      hostProfileDraft.stripe.accountNumber,
      hostProfileDraft.stripe.routingNumber,
      hostProfileDraft.stripe.payoutCurrency
    ];
    if (stripeFields.some((value) => !value.trim())) {
      return "Complete all Stripe onboarding fields before saving.";
    }

    const invalidSportIndex = hostProfileDraft.sports.findIndex((sportConfig) => {
      const availability = sportConfig.availability ?? createEmptySportConfig().availability;
      return (
        !sportConfig.sport.trim() ||
        !sportConfig.description.trim() ||
        !sportConfig.about.trim() ||
        !sportConfig.pricing ||
        Number(sportConfig.pricing) < 1 ||
        !sportConfig.level.trim() ||
        availability.days.length === 0 ||
        !availability.startTime ||
        !availability.endTime ||
        sportConfig.images.length === 0
      );
    });

    if (invalidSportIndex !== -1) {
      return `Complete all required fields for Sport ${invalidSportIndex + 1}.`;
    }

    return "";
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const validationError = validateOnboarding();

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    const profileToSave = {
      ...hostProfileDraft,
      sports: hostProfileDraft.sports.map((sportConfig) => ({
        ...sportConfig,
        pricing: Number(sportConfig.pricing)
      }))
    };

    onSaveHostProfile?.(profileToSave);
    setErrorMessage("");
    setSuccessMessage("Host onboarding saved successfully.");
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page host-settings-page">
          <h1>Host Settings</h1>
          <p>Complete Stripe onboarding and configure each sport profile.</p>

          <form className="host-onboarding-form" onSubmit={onSubmit}>
            <section className="host-onboarding-card">
              <h2>Stripe payout onboarding</h2>
              <div className="host-form-grid">
                <label htmlFor="stripeEmail">Stripe email</label>
                <input
                  id="stripeEmail"
                  type="email"
                  required
                  value={hostProfileDraft.stripe.stripeEmail}
                  onChange={(event) => updateStripeField("stripeEmail", event.target.value)}
                />

                <label htmlFor="accountHolderName">Account holder name</label>
                <input
                  id="accountHolderName"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.accountHolderName}
                  onChange={(event) => updateStripeField("accountHolderName", event.target.value)}
                />

                <label htmlFor="bankName">Bank name</label>
                <input
                  id="bankName"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.bankName}
                  onChange={(event) => updateStripeField("bankName", event.target.value)}
                />

                <label htmlFor="accountNumber">Account number / IBAN</label>
                <input
                  id="accountNumber"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.accountNumber}
                  onChange={(event) => updateStripeField("accountNumber", event.target.value)}
                />

                <label htmlFor="routingNumber">Routing number / SWIFT</label>
                <input
                  id="routingNumber"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.routingNumber}
                  onChange={(event) => updateStripeField("routingNumber", event.target.value)}
                />

                <label htmlFor="payoutCurrency">Payout currency</label>
                <select
                  id="payoutCurrency"
                  required
                  value={hostProfileDraft.stripe.payoutCurrency}
                  onChange={(event) => updateStripeField("payoutCurrency", event.target.value)}
                >
                  <option value="">Select currency</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="JPY">JPY</option>
                  <option value="INR">INR</option>
                  <option value="BRL">BRL</option>
                </select>

                <label htmlFor="hostCountry">Country</label>
                <input id="hostCountry" type="text" value={hostProfileDraft.country} readOnly />

                <label htmlFor="hostCity">City</label>
                <input id="hostCity" type="text" value={hostProfileDraft.city} readOnly />
              </div>
            </section>

            <section className="host-onboarding-card">
              <div className="host-sport-header">
                <h2>Sports onboarding</h2>
                <button type="button" className="btn btn-light" onClick={addSport}>
                  Add Sport
                </button>
              </div>

              <div className="host-sport-tabs" role="tablist" aria-label="Host sports tabs">
                {hostProfileDraft.sports.map((sportConfig, index) => (
                  <button
                    key={`sport-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={activeSportIndex === index}
                    className={`host-sport-tab${activeSportIndex === index ? " active" : ""}`}
                    onClick={() => setActiveSportIndex(index)}
                  >
                    {sportConfig.sport || `Sport ${index + 1}`}
                  </button>
                ))}
              </div>

              <div className="host-form-grid">
                <label htmlFor="sportType">Sport</label>
                <select
                  id="sportType"
                  required
                  value={activeSport.sport}
                  onChange={(event) => updateSportField("sport", event.target.value)}
                >
                  <option value="">Select sport</option>
                  {SPORT_OPTIONS.map((sportOption) => (
                    <option key={sportOption} value={sportOption}>
                      {sportOption}
                    </option>
                  ))}
                </select>

                <label htmlFor="sportDescription">Description</label>
                <textarea
                  id="sportDescription"
                  required
                  rows={2}
                  placeholder="Love coastal rides & coffee stops"
                  value={activeSport.description}
                  onChange={(event) => updateSportField("description", event.target.value)}
                />

                <label htmlFor="sportAbout">About</label>
                <textarea
                  id="sportAbout"
                  required
                  rows={4}
                  placeholder="Share your bio and hosting style"
                  value={activeSport.about}
                  onChange={(event) => updateSportField("about", event.target.value)}
                />

                <label htmlFor="sportPricing">Pricing</label>
                <input
                  id="sportPricing"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="How much do you charge?"
                  value={activeSport.pricing}
                  onChange={(event) => updateSportField("pricing", event.target.value)}
                />

                <label htmlFor="sportLevel">Level</label>
                <select
                  id="sportLevel"
                  required
                  value={activeSport.level}
                  onChange={(event) => updateSportField("level", event.target.value)}
                >
                  <option value="">Select level</option>
                  {LEVEL_OPTIONS.map((levelOption) => (
                    <option key={levelOption} value={levelOption}>
                      {levelOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="host-availability-block">
                <h3>Availability</h3>
                <p>Select weekly availability and a preferred time range.</p>
                <div className="host-availability-days">
                  {AVAILABILITY_DAYS.map((day) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        checked={activeSport.availability.days.includes(day)}
                        onChange={() => toggleAvailabilityDay(day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <div className="host-availability-time">
                  <div>
                    <label htmlFor="availabilityStart">From</label>
                    <input
                      id="availabilityStart"
                      type="time"
                      required
                      value={activeSport.availability.startTime}
                      onChange={(event) => updateAvailabilityTime("startTime", event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="availabilityEnd">To</label>
                    <input
                      id="availabilityEnd"
                      type="time"
                      required
                      value={activeSport.availability.endTime}
                      onChange={(event) => updateAvailabilityTime("endTime", event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="host-images-block">
                <h3>Images</h3>
                <input type="file" accept="image/*" multiple onChange={onSportImageSelect} />
                {activeSport.images.length > 0 && (
                  <div className="host-image-grid">
                    {activeSport.images.map((imageSrc, imageIndex) => (
                      <div key={imageIndex} className="host-image-item">
                        <img
                          src={imageSrc}
                          alt={
                            activeSport.sport
                              ? `${activeSport.sport} image ${imageIndex + 1}`
                              : `Sport ${activeSportIndex + 1} image ${imageIndex + 1}`
                          }
                        />
                        <button
                          type="button"
                          className="host-image-remove"
                          onClick={() => removeSportImage(imageIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {successMessage && <p className="host-success-message">{successMessage}</p>}

            <button type="submit" className="btn btn-primary">
              Save Host Settings
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default HostPage;
