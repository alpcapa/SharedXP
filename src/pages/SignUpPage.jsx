import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const COUNTRY_OPTIONS = [
  { name: "Brazil", code: "BR", dialCode: "+55" },
  { name: "Canada", code: "CA", dialCode: "+1" },
  { name: "France", code: "FR", dialCode: "+33" },
  { name: "Germany", code: "DE", dialCode: "+49" },
  { name: "India", code: "IN", dialCode: "+91" },
  { name: "Japan", code: "JP", dialCode: "+81" },
  { name: "Portugal", code: "PT", dialCode: "+351" },
  { name: "Spain", code: "ES", dialCode: "+34" },
  { name: "United Kingdom", code: "GB", dialCode: "+44" },
  { name: "United States", code: "US", dialCode: "+1" }
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

const SignUpPage = ({ currentUser, onLogout, onEmailSignUp, onSocialLogin }) => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    city: "",
    phoneCountryCode: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    photo: "",
    agreeTermsAndConditions: false,
    agreePromotionsAndMarketingEmails: false
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearchValue, setPhoneCodeSearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const countryDropdownRef = useRef(null);
  const phoneCodeDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);
  const phoneCodeListRef = useRef(null);
  const selectedCountry = useMemo(
    () => {
      const normalizedCountryInput = formValues.country.trim().toLowerCase();
      return (
        COUNTRY_OPTIONS.find(
          (countryOption) => countryOption.name.toLowerCase() === normalizedCountryInput
        ) ?? null
      );
    },
    [formValues.country]
  );
  const selectedPhoneCodeCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find((countryOption) => countryOption.code === formValues.phoneCountryCode) ??
      selectedCountry ??
      null,
    [formValues.phoneCountryCode, selectedCountry]
  );
  const filteredCountryOptions = useMemo(() => {
    const normalizedSearch = countrySearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return COUNTRY_OPTIONS;
    }

    return COUNTRY_OPTIONS.filter((countryOption) =>
      countryOption.name.toLowerCase().includes(normalizedSearch)
    );
  }, [countrySearchValue]);
  const availableCities = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }
    const cityOptions = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (formValues.city && !cityOptions.includes(formValues.city)) {
      return [formValues.city, ...cityOptions];
    }
    return cityOptions;
  }, [selectedCountry, formValues.city]);
  const filteredCityOptions = useMemo(() => {
    const normalizedSearch = citySearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return availableCities;
    }
    return availableCities.filter((cityOption) => cityOption.toLowerCase().includes(normalizedSearch));
  }, [availableCities, citySearchValue]);
  const filteredPhoneCodeOptions = useMemo(() => {
    const normalizedSearch = phoneCodeSearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return COUNTRY_OPTIONS;
    }

    return COUNTRY_OPTIONS.filter((countryOption) =>
      `${countryOption.name} ${countryOption.dialCode}`.toLowerCase().includes(normalizedSearch)
    );
  }, [phoneCodeSearchValue]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isCountryDropdownOpen &&
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target)
      ) {
        setIsCountryDropdownOpen(false);
      }

      if (
        isPhoneCodeDropdownOpen &&
        phoneCodeDropdownRef.current &&
        !phoneCodeDropdownRef.current.contains(event.target)
      ) {
        setIsPhoneCodeDropdownOpen(false);
      }

      if (isCityDropdownOpen && cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isCountryDropdownOpen, isPhoneCodeDropdownOpen, isCityDropdownOpen]);

  useEffect(() => {
    if (!isPhoneCodeDropdownOpen || !selectedPhoneCodeCountry || !phoneCodeListRef.current) {
      return;
    }

    const selectedOption = phoneCodeListRef.current.querySelector(
      `[data-country-code="${selectedPhoneCodeCountry.code}"]`
    );
    selectedOption?.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
  }, [isPhoneCodeDropdownOpen, selectedPhoneCodeCountry]);

  const onInputChange = (event) => {
    const { name, value, type, checked } = event.target;
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
    if (!formValues.city.trim()) {
      setErrorMessage("Please select a valid city from the list.");
      return;
    }
    if (!formValues.agreeTermsAndConditions) {
      setErrorMessage("Please agree to Terms & Conditions to continue.");
      return;
    }

    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const selectedDialCodeCountry = formValues.phoneCountryCode
      ? COUNTRY_OPTIONS.find((countryOption) => countryOption.code === formValues.phoneCountryCode)
      : selectedCountry;
    if (!selectedDialCodeCountry) {
      setErrorMessage("Please select a valid phone area code.");
      return;
    }
    const rawPhone = formValues.phone.trim();
    const phoneDigitsOnly = rawPhone.replace(/\D/g, "");
    const dialCodeDigits = selectedDialCodeCountry.dialCode.replace(/\D/g, "");
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
      city: formValues.city.trim(),
      countryDialCode: selectedDialCodeCountry.dialCode,
      phone: `${selectedDialCodeCountry.dialCode} ${localPhoneDigits}`.trim(),
      address: [formValues.addressLine1.trim(), formValues.addressLine2.trim()]
        .filter(Boolean)
        .join(", "),
      photo: formValues.photo,
      agreedToTermsAndConditions: formValues.agreeTermsAndConditions,
      agreedToPromotionsAndMarketingEmails: formValues.agreePromotionsAndMarketingEmails
    });
  };

  const getCountryFlag = (countryCode) =>
    countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0))
      );

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

                <label htmlFor="addressLine1">Address</label>
                <input
                  id="addressLine1"
                  name="addressLine1"
                  type="text"
                  required
                  value={formValues.addressLine1}
                  onChange={onInputChange}
                />
                <input
                  id="addressLine2"
                  name="addressLine2"
                  type="text"
                  aria-label="Address line 2"
                  value={formValues.addressLine2}
                  onChange={onInputChange}
                />

                <label id="country-label" htmlFor="country">
                  Country
                </label>
                <div className="auth-search-dropdown" ref={countryDropdownRef}>
                  <button
                    id="country"
                    type="button"
                    className="auth-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isCountryDropdownOpen}
                    aria-controls="country-listbox"
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
                        id="country-listbox"
                        className="auth-dropdown-options"
                        role="listbox"
                        aria-labelledby="country-label"
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
                                setFormValues((previousValues) => ({
                                  ...previousValues,
                                  country: countryOption.name,
                                  city: nextCities.includes(previousValues.city)
                                    ? previousValues.city
                                    : nextCities[0] || "",
                                  phoneCountryCode: countryOption.code
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

                <label id="city-label" htmlFor="city-selector">
                  City
                </label>
                <div className="auth-search-dropdown" ref={cityDropdownRef}>
                  <button
                    id="city-selector"
                    type="button"
                    className="auth-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isCityDropdownOpen}
                    aria-controls="city-listbox"
                    disabled={!selectedCountry}
                    onClick={() => {
                      setIsCityDropdownOpen((previousState) => !previousState);
                      setCitySearchValue("");
                    }}
                  >
                    {formValues.city || "Select city"}
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
                        id="city-listbox"
                        className="auth-dropdown-options"
                        role="listbox"
                        aria-labelledby="city-label"
                      >
                        {filteredCityOptions.map((cityOption) => (
                          <li key={cityOption}>
                            <button
                              type="button"
                              className="auth-dropdown-option"
                              role="option"
                              aria-selected={formValues.city === cityOption}
                              onClick={() => {
                                setFormValues((previousValues) => ({
                                  ...previousValues,
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

                <label id="phone-label" htmlFor="phone">
                  Phone
                </label>
                <div className="auth-phone-field">
                  <div className="auth-search-dropdown auth-phone-code-picker" ref={phoneCodeDropdownRef}>
                    <button
                      type="button"
                      className="auth-dropdown-trigger auth-phone-code-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={isPhoneCodeDropdownOpen}
                      aria-controls="phone-code-listbox"
                      onClick={() => {
                        setIsPhoneCodeDropdownOpen((previousState) => !previousState);
                        setPhoneCodeSearchValue("");
                      }}
                    >
                      {selectedPhoneCodeCountry ? (
                        <>
                          <span>{getCountryFlag(selectedPhoneCodeCountry.code)}</span>
                          <span>{selectedPhoneCodeCountry.dialCode}</span>
                        </>
                      ) : (
                        <span>Code</span>
                      )}
                    </button>
                    {isPhoneCodeDropdownOpen && (
                      <div className="auth-dropdown-panel">
                        <input
                          type="search"
                          className="auth-dropdown-search"
                          placeholder="Search country or code"
                          value={phoneCodeSearchValue}
                          onChange={(event) => setPhoneCodeSearchValue(event.target.value)}
                        />
                        <ul
                          id="phone-code-listbox"
                          className="auth-dropdown-options"
                          role="listbox"
                          aria-labelledby="phone-label"
                          ref={phoneCodeListRef}
                        >
                          {filteredPhoneCodeOptions.map((countryOption) => (
                            <li key={`phone-code-${countryOption.code}`}>
                              <button
                                type="button"
                                className="auth-dropdown-option"
                                data-country-code={countryOption.code}
                                role="option"
                                aria-selected={selectedPhoneCodeCountry?.code === countryOption.code}
                                onClick={() => {
                                  setFormValues((previousValues) => ({
                                    ...previousValues,
                                    phoneCountryCode: countryOption.code
                                  }));
                                  setIsPhoneCodeDropdownOpen(false);
                                }}
                              >
                                <span>{getCountryFlag(countryOption.code)}</span>
                                <span>
                                  {countryOption.name} ({countryOption.dialCode})
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
                <div className="form-consent-group">
                  <label className="form-consent-option" htmlFor="agreeTermsAndConditions">
                    <input
                      id="agreeTermsAndConditions"
                      name="agreeTermsAndConditions"
                      type="checkbox"
                      checked={formValues.agreeTermsAndConditions}
                      onChange={onInputChange}
                    />
                    <span>
                      I agree to{" "}
                      <a href="https://sharedxp.app/terms-and-conditions" target="_blank" rel="noreferrer">
                        Terms &amp; Conditions
                      </a>
                    </span>
                  </label>
                  <label className="form-consent-option" htmlFor="agreePromotionsAndMarketingEmails">
                    <input
                      id="agreePromotionsAndMarketingEmails"
                      name="agreePromotionsAndMarketingEmails"
                      type="checkbox"
                      checked={formValues.agreePromotionsAndMarketingEmails}
                      onChange={onInputChange}
                    />
                    <span>I agree to receive Promotions &amp; Marketing emails</span>
                  </label>
                </div>

                {errorMessage && <p className="auth-error">{errorMessage}</p>}
                <button type="submit" className="btn btn-primary auth-submit">
                  Continue
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
