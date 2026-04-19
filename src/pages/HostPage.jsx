import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const SPORT_OPTIONS = ["Cycling", "Tennis", "Running", "Football", "Surfing", "Basketball"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "I’m Flexible"];
const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL"];
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});
const COUNTRY_OPTIONS = [
  { name: "Brazil", code: "BR" },
  { name: "Canada", code: "CA" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "India", code: "IN" },
  { name: "Japan", code: "JP" },
  { name: "Portugal", code: "PT" },
  { name: "Spain", code: "ES" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" }
];
const COUNTRY_CITY_OPTIONS = {
  BR: ["Rio de Janeiro", "São Paulo", "Florianópolis", "Salvador"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary"],
  FR: ["Paris", "Lyon", "Nice", "Bordeaux"],
  DE: ["Berlin", "Munich", "Hamburg", "Cologne"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Goa"],
  JP: ["Tokyo", "Osaka", "Kyoto", "Sapporo"],
  PT: ["Lisbon", "Porto", "Faro", "Coimbra"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville"],
  GB: ["London", "Manchester", "Bristol", "Edinburgh"],
  US: ["New York", "Los Angeles", "Austin", "Miami"]
};
const REGIONAL_INDICATOR_OFFSET = 127397;
const REQUIRED_HOST_CONSENTS = [
  {
    field: "agreeTermsAndConditions",
    message: "Please agree to Terms & Conditions."
  },
  {
    field: "agreeHostingRelatedEmailsAndCalls",
    message: "Please agree to receive hosting related emails and calls."
  }
];

const createEmptySportConfig = () => ({
  sport: "",
  description: "",
  about: "",
  pricing: "",
  pricingCurrency: "",
  level: "",
  paused: false,
  equipmentAvailable: false,
  equipmentDetails: "",
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
    city: existingProfile.city ?? user?.city ?? inferCityFromAddress(user?.address) ?? "",
    stripe: {
      stripeEmail: existingProfile.stripe?.stripeEmail ?? user?.email ?? "",
      accountHolderName: existingProfile.stripe?.accountHolderName ?? user?.fullName ?? "",
      citizenIdNumber: existingProfile.stripe?.citizenIdNumber ?? "",
      taxNumber: existingProfile.stripe?.taxNumber ?? "",
      bankName: existingProfile.stripe?.bankName ?? "",
      accountNumber: existingProfile.stripe?.accountNumber ?? "",
      routingNumber: existingProfile.stripe?.routingNumber ?? "",
      payoutCurrency: existingProfile.stripe?.payoutCurrency ?? ""
    },
    consents: {
      agreeTermsAndConditions: existingProfile.consents?.agreeTermsAndConditions ?? false,
      agreePromotionsAndMarketingEmails:
        existingProfile.consents?.agreePromotionsAndMarketingEmails ?? false,
      agreeHostingRelatedEmailsAndCalls:
        existingProfile.consents?.agreeHostingRelatedEmailsAndCalls ?? false
    },
    sports: existingSports
  };
};

const HostPage = ({ currentUser, onLogout, onSaveHostProfile }) => {
  const location = useLocation();
  const isHostSettingsRoute = location.pathname === "/host-settings";
  const initialProfile = useMemo(() => getInitialHostProfile(currentUser), [currentUser]);
  const [hostProfileDraft, setHostProfileDraft] = useState(initialProfile);
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);

  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find(
        (countryOption) => countryOption.name.toLowerCase() === hostProfileDraft.country.trim().toLowerCase()
      ) ?? null,
    [hostProfileDraft.country]
  );

  const availableCities = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    const cityOptions = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (hostProfileDraft.city && !cityOptions.includes(hostProfileDraft.city)) {
      return [hostProfileDraft.city, ...cityOptions];
    }
    return cityOptions;
  }, [selectedCountry, hostProfileDraft.city]);

  const filteredCountryOptions = useMemo(() => {
    const normalizedSearch = countrySearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return COUNTRY_OPTIONS;
    }

    return COUNTRY_OPTIONS.filter((countryOption) =>
      countryOption.name.toLowerCase().includes(normalizedSearch)
    );
  }, [countrySearchValue]);

  const filteredCityOptions = useMemo(() => {
    const normalizedSearch = citySearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return availableCities;
    }

    return availableCities.filter((cityOption) => cityOption.toLowerCase().includes(normalizedSearch));
  }, [availableCities, citySearchValue]);

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isCountryDropdownOpen &&
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target)
      ) {
        setIsCountryDropdownOpen(false);
      }

      if (isCityDropdownOpen && cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isCountryDropdownOpen, isCityDropdownOpen]);

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

  if (!isHostSettingsRoute) {
    return <Navigate to="/host-settings" replace />;
  }

  const activeSport = hostProfileDraft.sports[activeSportIndex] ?? createEmptySportConfig();

  const getCountryFlag = (countryCode) =>
    countryCode
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0)));

  const updateStripeField = (fieldName, value) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      stripe: {
        ...previousDraft.stripe,
        [fieldName]: value
      }
    }));
  };

  const updateConsentField = (fieldName, value) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      consents: {
        ...previousDraft.consents,
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

  const updateEquipmentAvailability = (isAvailable) => {
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: previousDraft.sports.map((sportConfig, index) =>
        index === activeSportIndex
          ? {
              ...sportConfig,
              equipmentAvailable: isAvailable
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

  const removeSport = (sportIndexToRemove) => {
    const shouldDelete = window.confirm("Are you sure you want to delete this sport?");
    if (!shouldDelete) {
      return;
    }

    if (hostProfileDraft.sports.length <= 1) {
      setHostProfileDraft((previousDraft) => ({
        ...previousDraft,
        sports: [createEmptySportConfig()]
      }));
      setActiveSportIndex(0);
      setErrorMessage("");
      setSuccessMessage("");
      return;
    }

    const nextSports = hostProfileDraft.sports.filter((_, index) => index !== sportIndexToRemove);
    setHostProfileDraft((previousDraft) => ({
      ...previousDraft,
      sports: nextSports
    }));
    setActiveSportIndex((previousIndex) => {
      if (sportIndexToRemove < previousIndex) {
        return previousIndex - 1;
      }
      if (sportIndexToRemove === previousIndex) {
        return Math.min(previousIndex, nextSports.length - 1);
      }
      return previousIndex;
    });
    setErrorMessage("");
    setSuccessMessage("");
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
      return "Please choose your host country.";
    }

    if (!hostProfileDraft.city.trim()) {
      return "Please choose your host city.";
    }

    const stripeFields = [
      hostProfileDraft.stripe.stripeEmail,
      hostProfileDraft.stripe.accountHolderName,
      hostProfileDraft.stripe.citizenIdNumber,
      hostProfileDraft.stripe.taxNumber,
      hostProfileDraft.stripe.bankName,
      hostProfileDraft.stripe.accountNumber,
      hostProfileDraft.stripe.routingNumber,
      hostProfileDraft.stripe.payoutCurrency
    ];
    if (stripeFields.some((value) => !value.trim())) {
      return "Complete all bank details before saving.";
    }
    const missingConsent = REQUIRED_HOST_CONSENTS.find(
      (consentConfig) => !hostProfileDraft.consents?.[consentConfig.field]
    );
    if (missingConsent) {
      return missingConsent.message;
    }

    const invalidSportIndex = hostProfileDraft.sports.findIndex((sportConfig) => {
      const availability = sportConfig.availability ?? createEmptySportConfig().availability;
      return (
        !sportConfig.sport.trim() ||
        !sportConfig.description.trim() ||
        !sportConfig.about.trim() ||
        !sportConfig.pricing ||
        Number(sportConfig.pricing) < 1 ||
        !sportConfig.pricingCurrency.trim() ||
        !sportConfig.level.trim() ||
        (sportConfig.equipmentAvailable && !sportConfig.equipmentDetails.trim()) ||
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
          <p>Complete sport setup and bank details to start hosting.</p>

          <form className="host-onboarding-form" onSubmit={onSubmit}>
            <section className="host-onboarding-card">
              <div className="host-sport-header">
                <h2>Sports onboarding</h2>
                <button type="button" className="btn btn-light" onClick={addSport}>
                  Add Sport
                </button>
              </div>
              <div className="host-pause-toggle">
                <input
                  id={`pauseSport-${activeSportIndex}`}
                  type="checkbox"
                  checked={Boolean(activeSport.paused)}
                  onChange={(event) => updateSportField("paused", event.target.checked)}
                />
                <label htmlFor={`pauseSport-${activeSportIndex}`}>
                  {`Pause ${activeSport.sport || `Sport ${activeSportIndex + 1}`}`}
                </label>
              </div>

              <div className="host-sport-tabs" role="tablist" aria-label="Host sports tabs">
                {hostProfileDraft.sports.map((sportConfig, index) => (
                  <div key={`sport-tab-${index}`} className="host-sport-tab-wrap">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSportIndex === index}
                      className={`host-sport-tab${activeSportIndex === index ? " active" : ""}`}
                      onClick={() => setActiveSportIndex(index)}
                    >
                      {sportConfig.sport || `Sport ${index + 1}`}
                    </button>
                    <button
                      type="button"
                      className="host-sport-delete"
                      aria-label={`Delete ${sportConfig.sport || `Sport ${index + 1}`}`}
                      onClick={() => removeSport(index)}
                    >
                      ×
                    </button>
                  </div>
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
                  maxLength={50}
                  rows={2}
                  placeholder="Love coastal rides & coffee stops"
                  value={activeSport.description}
                  onChange={(event) => updateSportField("description", event.target.value)}
                />
                <p className="host-field-hint">{activeSport.description.length}/50</p>

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
                <div className="host-price-row">
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
                  <select
                    aria-label="Pricing currency"
                    required
                    value={activeSport.pricingCurrency}
                    onChange={(event) => updateSportField("pricingCurrency", event.target.value)}
                  >
                    <option value="">Currency</option>
                    {CURRENCY_OPTIONS.map((currencyOption) => (
                      <option key={currencyOption} value={currencyOption}>
                        {currencyOption}
                      </option>
                    ))}
                  </select>
                </div>

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

                <label>Equipment Availability</label>
                <div className="host-toggle-group" role="radiogroup" aria-label="Equipment availability">
                  <label htmlFor={`equipment-yes-${activeSportIndex}`}>
                    <input
                      id={`equipment-yes-${activeSportIndex}`}
                      type="radio"
                      name="equipmentAvailability"
                      checked={Boolean(activeSport.equipmentAvailable)}
                      onChange={() => updateEquipmentAvailability(true)}
                    />
                    Yes
                  </label>
                  <label htmlFor={`equipment-no-${activeSportIndex}`}>
                    <input
                      id={`equipment-no-${activeSportIndex}`}
                      type="radio"
                      name="equipmentAvailability"
                      checked={!activeSport.equipmentAvailable}
                      onChange={() => updateEquipmentAvailability(false)}
                    />
                    No
                  </label>
                </div>

                <label htmlFor="equipmentDetails">Equipment Details</label>
                <textarea
                  id="equipmentDetails"
                  rows={3}
                  placeholder="List the equipment you will provide"
                  value={activeSport.equipmentDetails}
                  onChange={(event) => updateSportField("equipmentDetails", event.target.value)}
                  disabled={!activeSport.equipmentAvailable}
                  className="host-equipment-details"
                />
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
                    <select
                      id="availabilityStart"
                      required
                      value={activeSport.availability.startTime}
                      onChange={(event) => updateAvailabilityTime("startTime", event.target.value)}
                    >
                      <option value="">Select start time</option>
                      {TIME_OPTIONS.map((timeOption) => (
                        <option key={`start-${timeOption}`} value={timeOption}>
                          {timeOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="availabilityEnd">To</label>
                    <select
                      id="availabilityEnd"
                      required
                      value={activeSport.availability.endTime}
                      onChange={(event) => updateAvailabilityTime("endTime", event.target.value)}
                    >
                      <option value="">Select end time</option>
                      {TIME_OPTIONS.map((timeOption) => (
                        <option key={`end-${timeOption}`} value={timeOption}>
                          {timeOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="host-images-block">
                <h3>Photo Gallery</h3>
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

            <section className="host-onboarding-card">
              <h2>Bank Details (Required for us to pay you)</h2>
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

                <label htmlFor="citizenIdNumber">Citizen ID number</label>
                <input
                  id="citizenIdNumber"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.citizenIdNumber}
                  onChange={(event) => updateStripeField("citizenIdNumber", event.target.value)}
                />

                <label htmlFor="taxNumber">Tax Number</label>
                <input
                  id="taxNumber"
                  type="text"
                  required
                  value={hostProfileDraft.stripe.taxNumber}
                  onChange={(event) => updateStripeField("taxNumber", event.target.value)}
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
                  {CURRENCY_OPTIONS.map((currencyOption) => (
                    <option key={currencyOption} value={currencyOption}>
                      {currencyOption}
                    </option>
                  ))}
                </select>

                <label id="host-country-label" htmlFor="host-country-selector">Country</label>
                <div className="auth-search-dropdown" ref={countryDropdownRef}>
                  <button
                    id="host-country-selector"
                    type="button"
                    className="auth-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isCountryDropdownOpen}
                    aria-controls="host-country-listbox"
                    onClick={() => {
                      setIsCountryDropdownOpen((previousState) => !previousState);
                      setCountrySearchValue("");
                    }}
                  >
                    {selectedCountry ? (
                      <>
                        <span>{getCountryFlag(selectedCountry.code)}</span>
                        <span>{selectedCountry.name}</span>
                      </>
                    ) : (
                      <span>Select country</span>
                    )}
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="auth-dropdown-panel">
                      <input
                        type="search"
                        className="auth-dropdown-search"
                        placeholder="Search country"
                        value={countrySearchValue}
                        onChange={(event) => setCountrySearchValue(event.target.value)}
                      />
                      <ul
                        id="host-country-listbox"
                        className="auth-dropdown-options"
                        role="listbox"
                        aria-labelledby="host-country-label"
                      >
                        {filteredCountryOptions.map((countryOption) => (
                          <li key={countryOption.code}>
                            <button
                              type="button"
                              className="auth-dropdown-option"
                              role="option"
                              aria-selected={selectedCountry?.code === countryOption.code}
                              onClick={() => {
                                const nextCities = COUNTRY_CITY_OPTIONS[countryOption.code] ?? [];
                                setHostProfileDraft((previousDraft) => ({
                                  ...previousDraft,
                                  country: countryOption.name,
                                  city: nextCities[0] ?? ""
                                }));
                                setIsCountryDropdownOpen(false);
                              }}
                            >
                              <span>{getCountryFlag(countryOption.code)}</span>
                              <span>{countryOption.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <label id="host-city-label" htmlFor="host-city-selector">City</label>
                <div className="auth-search-dropdown" ref={cityDropdownRef}>
                  <button
                    id="host-city-selector"
                    type="button"
                    className="auth-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isCityDropdownOpen}
                    aria-controls="host-city-listbox"
                    disabled={!selectedCountry}
                    onClick={() => {
                      setIsCityDropdownOpen((previousState) => !previousState);
                      setCitySearchValue("");
                    }}
                  >
                    {hostProfileDraft.city || "Select city"}
                  </button>
                  {isCityDropdownOpen && (
                    <div className="auth-dropdown-panel">
                      <input
                        type="search"
                        className="auth-dropdown-search"
                        placeholder="Search city"
                        value={citySearchValue}
                        onChange={(event) => setCitySearchValue(event.target.value)}
                      />
                      <ul
                        id="host-city-listbox"
                        className="auth-dropdown-options"
                        role="listbox"
                        aria-labelledby="host-city-label"
                      >
                        {filteredCityOptions.map((cityOption) => (
                          <li key={cityOption}>
                            <button
                              type="button"
                              className="auth-dropdown-option"
                              role="option"
                              aria-selected={hostProfileDraft.city === cityOption}
                              onClick={() => {
                                setHostProfileDraft((previousDraft) => ({
                                  ...previousDraft,
                                  city: cityOption
                                }));
                                setIsCityDropdownOpen(false);
                              }}
                            >
                              <span>{cityOption}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="host-onboarding-card">
              <h2>Consents</h2>
              <div className="form-consent-group">
                <label className="form-consent-option" htmlFor="hostAgreeTermsAndConditions">
                  <input
                    id="hostAgreeTermsAndConditions"
                    type="checkbox"
                    checked={hostProfileDraft.consents?.agreeTermsAndConditions ?? false}
                    onChange={(event) =>
                      updateConsentField("agreeTermsAndConditions", event.target.checked)
                    }
                  />
                  <span>
                    I agree to{" "}
                    <a href="/terms-and-conditions">
                      Terms &amp; Conditions
                    </a>
                  </span>
                </label>
                <label
                  className="form-consent-option"
                  htmlFor="hostAgreeHostingRelatedEmailsAndCalls"
                >
                  <input
                    id="hostAgreeHostingRelatedEmailsAndCalls"
                    type="checkbox"
                    checked={hostProfileDraft.consents?.agreeHostingRelatedEmailsAndCalls ?? false}
                    onChange={(event) =>
                      updateConsentField("agreeHostingRelatedEmailsAndCalls", event.target.checked)
                    }
                  />
                  <span>I agree to receive hosting related emails and calls</span>
                </label>
                <label
                  className="form-consent-option"
                  htmlFor="hostAgreePromotionsAndMarketingEmails"
                >
                  <input
                    id="hostAgreePromotionsAndMarketingEmails"
                    type="checkbox"
                    checked={hostProfileDraft.consents?.agreePromotionsAndMarketingEmails ?? false}
                    onChange={(event) =>
                      updateConsentField("agreePromotionsAndMarketingEmails", event.target.checked)
                    }
                  />
                  <span>I agree to receive Promotions &amp; Marketing emails</span>
                </label>
              </div>
            </section>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {successMessage && <p className="host-success-message">{successMessage}</p>}

            <button type="submit" className="btn btn-primary">
              Save Host Settings
            </button>
          </form>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HostPage;
