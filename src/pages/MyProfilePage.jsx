import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { COUNTRY_OPTIONS } from "../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../data/countryCities";
const LANGUAGE_OPTIONS = [
  "Arabic",
  "Bengali",
  "Dutch",
  "English",
  "French",
  "German",
  "Greek",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Russian",
  "Spanish",
  "Swedish",
  "Turkish",
  "Urdu"
];
const LANGUAGE_SLOT_LABELS = ["Native", "Add new", "Add new", "Add new"];
const SPORT_OPTIONS = ["Cycling", "Tennis", "Running", "Football", "Surfing", "Basketball"];
const SPORT_SLOT_LABELS = ["Favorite", "Add new", "Add new", "Add new"];
const REGIONAL_INDICATOR_OFFSET = 127397;
const BIRTHDAY_PATTERN_SOURCE = "(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/\\d{4}";
const BIRTHDAY_PATTERN = new RegExp(`^${BIRTHDAY_PATTERN_SOURCE}$`);

const normalizeBirthdayInput = (value) =>
  String(value ?? "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, "")
    .trim();

const isValidBirthday = (value) => {
  if (!BIRTHDAY_PATTERN.test(value)) {
    return false;
  }

  const [dayPart, monthPart, yearPart] = value.split("/");
  const day = Number(dayPart);
  const month = Number(monthPart);
  const year = Number(yearPart);
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return (
    normalizedDate.getUTCFullYear() === year &&
    normalizedDate.getUTCMonth() === month - 1 &&
    normalizedDate.getUTCDate() === day &&
    normalizedDate <= todayUtc
  );
};
const getLanguageSlots = (userLanguages) =>
  Array.from({ length: 4 }, (_, index) =>
    typeof userLanguages?.[index] === "string" ? userLanguages[index] : ""
  );
const getSportSlots = (userSports) =>
  Array.from({ length: 4 }, (_, index) =>
    typeof userSports?.[index] === "string" ? userSports[index] : ""
  );
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

  const normalizedImageSource = imageSource.trim();
  if (/^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,/i.test(normalizedImageSource)) {
    return normalizedImageSource;
  }

  try {
    const parsedImageSource = new URL(normalizedImageSource);
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

const getPhoneDetails = (user) => {
  const normalizedPhone = String(user?.phone ?? "").trim();
  const explicitCountryCode = user?.phoneCountryCode || user?.countryCode || "";
  const explicitCountry = COUNTRY_OPTIONS.find((countryOption) => countryOption.code === explicitCountryCode);
  const normalizedDialCode = explicitCountry?.dialCode ?? user?.countryDialCode ?? "";
  const withExplicitCode =
    explicitCountry && explicitCountry.dialCode === normalizedDialCode
      ? explicitCountry
      : COUNTRY_OPTIONS.find((countryOption) => countryOption.dialCode === normalizedDialCode);
  if (withExplicitCode) {
    const phoneDigitsOnly = normalizedPhone.replace(/\D/g, "");
    const dialCodeDigits = withExplicitCode.dialCode.replace(/\D/g, "");
    return {
      phoneCountryCode: withExplicitCode.code,
      phone: phoneDigitsOnly.startsWith(dialCodeDigits)
        ? phoneDigitsOnly.slice(dialCodeDigits.length)
        : phoneDigitsOnly
    };
  }

  const phoneDigitsOnly = normalizedPhone.replace(/\D/g, "");
  const matchedDialCodeCountry = [...COUNTRY_OPTIONS]
    .sort((firstCountry, secondCountry) => secondCountry.dialCode.length - firstCountry.dialCode.length)
    .find((countryOption) => phoneDigitsOnly.startsWith(countryOption.dialCode.replace(/\D/g, "")));

  if (!matchedDialCodeCountry) {
    return {
      phoneCountryCode: user?.countryCode ?? "",
      phone: phoneDigitsOnly
    };
  }

  const dialCodeDigits = matchedDialCodeCountry.dialCode.replace(/\D/g, "");
  return {
    phoneCountryCode: matchedDialCodeCountry.code,
    phone: phoneDigitsOnly.slice(dialCodeDigits.length)
  };
};

const getInitialFormValues = (user) => {
  const { addressLine1, addressLine2 } = getAddressLines(user?.address);
  const phoneDetails = getPhoneDetails(user);
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phoneCountryCode: phoneDetails.phoneCountryCode,
    phone: phoneDetails.phone,
    languages: getLanguageSlots(user?.languages),
    sports: getSportSlots(user?.sports),
    country: user?.country ?? "",
    city: user?.city ?? "",
    addressLine1,
    addressLine2,
    photo: user?.photo ?? "",
    birthday: user?.birthday ?? "",
    gender: user?.gender ?? "Not Sharing",
    agreedToTermsAndConditions: Boolean(user?.agreedToTermsAndConditions),
    agreedToPromotionsAndMarketingEmails: Boolean(user?.agreedToPromotionsAndMarketingEmails)
  };
};

const MyProfilePage = ({ currentUser, onLogout, onUpdateProfile }) => {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);
  const phoneCodeDropdownRef = useRef(null);
  const phoneCodeListRef = useRef(null);
  const [formValues, setFormValues] = useState(getInitialFormValues(currentUser));
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearchValue, setPhoneCodeSearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCountry = useMemo(() => {
    const normalizedCountryInput = formValues.country.trim().toLowerCase();
    return (
      COUNTRY_OPTIONS.find(
        (countryOption) => countryOption.name.toLowerCase() === normalizedCountryInput
      ) ?? null
    );
  }, [formValues.country]);
  const selectedPhoneCodeCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find((countryOption) => countryOption.code === formValues.phoneCountryCode) ??
      selectedCountry ??
      null,
    [formValues.phoneCountryCode, selectedCountry]
  );
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
    setFormValues(getInitialFormValues(currentUser));
    setSelectedPhotoFile(null);
    setSelectedPhotoPreviewUrl("");
    setErrorMessage("");
    setSuccessMessage("");
  }, [currentUser]);

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

  useEffect(
    () => () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
      }
    },
    [selectedPhotoPreviewUrl]
  );

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

  const onLanguageChange = (languageIndex, languageValue) => {
    setFormValues((previousValues) => {
      const nextLanguages = [...previousValues.languages];
      nextLanguages[languageIndex] = languageValue;
      return {
        ...previousValues,
        languages: nextLanguages
      };
    });
  };

  const onSportChange = (sportIndex, sportValue) => {
    setFormValues((previousValues) => {
      const nextSports = [...previousValues.sports];
      nextSports[sportIndex] = sportValue;
      return {
        ...previousValues,
        sports: nextSports
      };
    });
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

  const getCountryFlag = (countryCode) =>
    countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0))
      );

  const onSubmit = async (event) => {
    event.preventDefault();

    const userConfirmedChanges = window.confirm(
      "Are you sure you want to save these profile changes?"
    );
    if (!userConfirmedChanges) {
      return;
    }

    if (!selectedCountry) {
      setSuccessMessage("");
      setErrorMessage("Please select a valid country from the list.");
      return;
    }
    if (!formValues.city.trim()) {
      setSuccessMessage("");
      setErrorMessage("Please select a valid city from the list.");
      return;
    }
    const selectedDialCodeCountry = formValues.phoneCountryCode
      ? COUNTRY_OPTIONS.find((countryOption) => countryOption.code === formValues.phoneCountryCode)
      : selectedCountry;
    if (!selectedDialCodeCountry) {
      setSuccessMessage("");
      setErrorMessage("Please select a valid phone area code.");
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

    const rawPhone = formValues.phone.trim();
    const phoneDigitsOnly = rawPhone.replace(/\D/g, "");
    const dialCodeDigits = selectedDialCodeCountry.dialCode.replace(/\D/g, "");
    const localPhoneDigits = phoneDigitsOnly.startsWith(dialCodeDigits)
      ? phoneDigitsOnly.slice(dialCodeDigits.length)
      : phoneDigitsOnly;
    const normalizedBirthday = normalizeBirthdayInput(formValues.birthday);
    if (normalizedBirthday && !isValidBirthday(normalizedBirthday)) {
      setSuccessMessage("");
      setErrorMessage("Please enter a valid birthday in DD/MM/YYYY format.");
      return;
    }

    const profilePayload = {
      email: formValues.email.trim().toLowerCase(),
      phoneCountryCode: selectedDialCodeCountry.code,
      countryDialCode: selectedDialCodeCountry.dialCode,
      phone: `${selectedDialCodeCountry.dialCode} ${localPhoneDigits}`.trim(),
      languages: formValues.languages.map((languageOption) => languageOption.trim()),
      sports: formValues.sports.map((sportOption) => sportOption.trim()),
      country: selectedCountry.name,
      city: formValues.city.trim(),
      address: [formValues.addressLine1.trim(), formValues.addressLine2.trim()]
        .filter(Boolean)
        .join(", "),
      photo: nextPhoto,
      birthday: normalizedBirthday,
      gender: formValues.gender,
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
          <div className="profile-back-wrap">
            <Link to="/user-profile" className="back-link">
              ← Back to My Profile
            </Link>
          </div>
          <h1>Edit Profile</h1>
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

              <label id="country-label" htmlFor="country-selector">
                Country
              </label>
              <div className="auth-search-dropdown" ref={countryDropdownRef}>
                <button
                  id="country-selector"
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

              <label htmlFor="birthday">Birthday</label>
              <input
                id="birthday"
                name="birthday"
                type="text"
                inputMode="numeric"
                placeholder="31/01/1980"
                pattern={BIRTHDAY_PATTERN_SOURCE}
                title="Please use DD/MM/YYYY format, for example 31/01/1980."
                value={formValues.birthday}
                onChange={onInputChange}
              />

              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={formValues.gender} onChange={onInputChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Not Sharing">Not Sharing</option>
              </select>

              <label htmlFor="profile-language-0">Language</label>
              <div className="auth-language-row">
                {LANGUAGE_SLOT_LABELS.map((languageSlotLabel, languageIndex) => (
                  <input
                    key={`profile-language-${languageIndex}`}
                    id={`profile-language-${languageIndex}`}
                    list="profile-language-options"
                    placeholder={languageSlotLabel}
                    aria-label={`Language ${languageSlotLabel}`}
                    value={formValues.languages[languageIndex] ?? ""}
                    onChange={(event) => onLanguageChange(languageIndex, event.target.value)}
                    required={languageIndex === 0}
                  />
                ))}
              </div>
              <datalist id="profile-language-options">
                {LANGUAGE_OPTIONS.map((languageOption) => (
                  <option key={languageOption} value={languageOption} />
                ))}
              </datalist>

              <label htmlFor="profile-sport-0">Sports</label>
              <div className="auth-language-row">
                {SPORT_SLOT_LABELS.map((sportSlotLabel, sportIndex) => (
                  <input
                    key={`profile-sport-${sportIndex}`}
                    id={`profile-sport-${sportIndex}`}
                    list="profile-sport-options"
                    placeholder={sportSlotLabel}
                    aria-label={`Sport ${sportSlotLabel}`}
                    value={formValues.sports[sportIndex] ?? ""}
                    onChange={(event) => onSportChange(sportIndex, event.target.value)}
                    required={sportIndex === 0}
                  />
                ))}
              </div>
              <datalist id="profile-sport-options">
                {SPORT_OPTIONS.map((sportOption) => (
                  <option key={sportOption} value={sportOption} />
                ))}
              </datalist>
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

        <SiteFooter />
      </div>
    </div>
  );
};

export default MyProfilePage;
