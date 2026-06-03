import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import InlineLoginForm from "../components/InlineLoginForm";
import MyProfileForm from "../components/profile/MyProfileForm";
import { COUNTRY_OPTIONS } from "../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../data/countryCities";

const BIRTHDAY_PATTERN = new RegExp(
  "^(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/\\d{4}$"
);

const normalizeBirthdayInput = (value) =>
  String(value ?? "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, "")
    .trim();

const isValidBirthday = (value) => {
  if (!BIRTHDAY_PATTERN.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= today
  );
};

const padToFour = (arr) =>
  Array.from({ length: 4 }, (_, i) =>
    typeof arr?.[i] === "string" ? arr[i] : ""
  );

const getAddressLines = (address) => {
  if (!address) return { addressLine1: "", addressLine2: "" };
  const [first = "", ...rest] = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return { addressLine1: first, addressLine2: rest.join(", ") };
};

const DEFAULT_PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80";

const getSafeImageSource = (src, fallback) => {
  if (typeof src !== "string") return fallback;
  const value = src.trim();
  if (/^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,/i.test(value))
    return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : fallback;
  } catch {
    return fallback;
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
  const rawPhone = String(user?.phone ?? "").trim();
  const explicitCode = user?.phoneCountryCode || user?.countryCode || "";
  const explicitCountry = COUNTRY_OPTIONS.find((c) => c.code === explicitCode);
  const dialCode = explicitCountry?.dialCode ?? user?.countryDialCode ?? "";
  const matched =
    explicitCountry && explicitCountry.dialCode === dialCode
      ? explicitCountry
      : COUNTRY_OPTIONS.find((c) => c.dialCode === dialCode);

  if (matched) {
    const phoneDigits = rawPhone.replace(/\D/g, "");
    const dialDigits = matched.dialCode.replace(/\D/g, "");
    return {
      phoneCountryCode: matched.code,
      phone: phoneDigits.startsWith(dialDigits)
        ? phoneDigits.slice(dialDigits.length)
        : phoneDigits,
    };
  }

  // Fall back: try to detect dial code from longest-prefix match.
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const longestMatch = [...COUNTRY_OPTIONS]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => phoneDigits.startsWith(c.dialCode.replace(/\D/g, "")));
  if (!longestMatch) {
    return { phoneCountryCode: user?.countryCode ?? "", phone: phoneDigits };
  }
  const dialDigits = longestMatch.dialCode.replace(/\D/g, "");
  return {
    phoneCountryCode: longestMatch.code,
    phone: phoneDigits.slice(dialDigits.length),
  };
};

const getInitialFormValues = (user) => {
  const { addressLine1, addressLine2 } = getAddressLines(user?.address);
  const phone = getPhoneDetails(user);
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phoneCountryCode: phone.phoneCountryCode,
    phone: phone.phone,
    languages: padToFour(user?.languages),
    sports: padToFour(user?.sports),
    country: user?.country ?? "",
    city: user?.city ?? "",
    addressLine1,
    addressLine2,
    photo: user?.photo ?? "",
    birthday: user?.birthday ?? "",
    gender: user?.gender ?? "Not Sharing",
    agreedToTermsAndConditions: Boolean(user?.agreedToTermsAndConditions),
    agreedToPromotionsAndMarketingEmails: Boolean(
      user?.agreedToPromotionsAndMarketingEmails
    ),
  };
};

// ── Page component ─────────────────────────────────────────────────────────

const MyProfilePage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword, onUpdateProfile }) => {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);
  const phoneCodeDropdownRef = useRef(null);
  const phoneCodeListRef = useRef(null);

  const [formValues, setFormValues] = useState(
    getInitialFormValues(currentUser)
  );
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearchValue, setPhoneCodeSearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);

  const selectedCountry = useMemo(() => {
    const search = formValues.country.trim().toLowerCase();
    return (
      COUNTRY_OPTIONS.find((c) => c.name.toLowerCase() === search) ?? null
    );
  }, [formValues.country]);

  const selectedPhoneCodeCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find((c) => c.code === formValues.phoneCountryCode) ??
      selectedCountry ??
      null,
    [formValues.phoneCountryCode, selectedCountry]
  );

  const availableCities = useMemo(() => {
    if (!selectedCountry) return [];
    const cities = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (formValues.city && !cities.includes(formValues.city)) {
      return [formValues.city, ...cities];
    }
    return cities;
  }, [selectedCountry, formValues.city]);

  const filteredCountryOptions = useMemo(() => {
    const search = countrySearchValue.trim().toLowerCase();
    if (!search) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) =>
      c.name.toLowerCase().includes(search)
    );
  }, [countrySearchValue]);

  const filteredCityOptions = useMemo(() => {
    const search = citySearchValue.trim().toLowerCase();
    if (!search) return availableCities;
    return availableCities.filter((c) => c.toLowerCase().includes(search));
  }, [availableCities, citySearchValue]);

  const filteredPhoneCodeOptions = useMemo(() => {
    const search = phoneCodeSearchValue.trim().toLowerCase();
    if (!search) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) =>
      `${c.name} ${c.dialCode}`.toLowerCase().includes(search)
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
      if (
        isCityDropdownOpen &&
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target)
      ) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCountryDropdownOpen, isPhoneCodeDropdownOpen, isCityDropdownOpen]);

  useEffect(
    () => () => {
      if (selectedPhotoPreviewUrl) URL.revokeObjectURL(selectedPhotoPreviewUrl);
    },
    [selectedPhotoPreviewUrl]
  );

  // Auto-scroll the phone-code dropdown to the currently selected country.
  useEffect(() => {
    if (
      !isPhoneCodeDropdownOpen ||
      !selectedPhoneCodeCountry ||
      !phoneCodeListRef.current
    ) {
      return;
    }
    const selected = phoneCodeListRef.current.querySelector(
      `[data-country-code="${selectedPhoneCodeCountry.code}"]`
    );
    selected?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isPhoneCodeDropdownOpen, selectedPhoneCodeCountry]);

  if (!currentUser) {
    if (authLoading) {
      return (
        <div className="home-page">
          <div className="middle-page-frame">
            <section className="hero auth-hero">
              <SiteHeader currentUser={currentUser} onLogout={onLogout} />
            </section>
            <main className="middle-section simple-page">
              <p>Loading…</p>
            </main>
            <SiteFooter />
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <InlineLoginForm
              onEmailLogin={onEmailLogin}
              onForgotPassword={onForgotPassword}
              title="Please log in"
              description="You need to log in to see your profile."
            />
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  const profilePhoto =
    selectedPhotoPreviewUrl ||
    getSafeImageSource(
      formValues.photo || currentUser.photo,
      DEFAULT_PROFILE_PHOTO
    );

  const onInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onLanguageChange = (index, value) => {
    setFormValues((prev) => {
      const next = [...prev.languages];
      next[index] = value;
      return { ...prev, languages: next };
    });
  };

  const onSportChange = (index, value) => {
    setFormValues((prev) => {
      const next = [...prev.sports];
      next[index] = value;
      return { ...prev, sports: next };
    });
  };

  const onPhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.type)) {
      setSuccessMessage("");
      setErrorMessage("Please upload a JPG, PNG, HEIC, WEBP, GIF, or BMP image.");
      return;
    }
    if (selectedPhotoPreviewUrl) URL.revokeObjectURL(selectedPhotoPreviewUrl);
    setSelectedPhotoFile(file);
    setSelectedPhotoPreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const err = (msg, field) => { setSuccessMessage(""); setErrorMessage(msg); setInvalidField(field); };
    if (!formValues.email.trim()) return err("Please enter your email address.", "email");
    if (!formValues.addressLine1.trim()) return err("Please enter your address.", "addressLine1");
    if (!selectedCountry) return err("Please select a valid country from the list.", "country-selector");
    if (!formValues.city.trim()) return err("Please select a valid city from the list.", "city-selector");
    if (!formValues.phone.trim()) return err("Please enter your phone number.", "phone");
    if (!formValues.languages[0].trim()) return err("Please select your native language.", "profile-language-0");
    if (!formValues.sports[0].trim()) return err("Please select your favorite sport.", "profile-sport-0");
    const dialCountry = formValues.phoneCountryCode
      ? COUNTRY_OPTIONS.find((c) => c.code === formValues.phoneCountryCode)
      : selectedCountry;
    if (!dialCountry) return err("Please select a valid phone area code.", "phone");

    let nextPhoto = formValues.photo;
    if (selectedPhotoFile) {
      try {
        nextPhoto = await fileToDataUrl(selectedPhotoFile);
      } catch {
        setSuccessMessage("");
        setErrorMessage("Could not read the selected photo. Please try again.");
        return;
      }
    }

    const phoneDigits = formValues.phone.trim().replace(/\D/g, "");
    const dialDigits = dialCountry.dialCode.replace(/\D/g, "");
    const localDigits = phoneDigits.startsWith(dialDigits)
      ? phoneDigits.slice(dialDigits.length)
      : phoneDigits;
    const normalizedBirthday = normalizeBirthdayInput(formValues.birthday);
    if (normalizedBirthday && !isValidBirthday(normalizedBirthday)) {
      setSuccessMessage("");
      setErrorMessage("Please enter a valid birthday in DD/MM/YYYY format.");
      return;
    }

    const payload = {
      email: formValues.email.trim().toLowerCase(),
      phoneCountryCode: dialCountry.code,
      countryDialCode: dialCountry.dialCode,
      phone: `${dialCountry.dialCode} ${localDigits}`.trim(),
      languages: formValues.languages.map((l) => l.trim()),
      sports: formValues.sports.map((s) => s.trim()),
      country: selectedCountry.name,
      city: formValues.city.trim(),
      address: [
        formValues.addressLine1.trim(),
        formValues.addressLine2.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      photo: nextPhoto,
      birthday: normalizedBirthday,
      gender: formValues.gender,
      agreedToPromotionsAndMarketingEmails:
        formValues.agreedToPromotionsAndMarketingEmails,
    };

    setSaveStatus("saving");
    const result = await onUpdateProfile?.(payload);
    if (!result?.success) {
      setSaveStatus("idle");
      setSuccessMessage("");
      setErrorMessage(
        result?.message ?? "Could not save changes. Please try again."
      );
      return;
    }
    setErrorMessage("");
    setInvalidField("");
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);

    if (result.emailChangeRequested) {
      setShowEmailConfirmDialog(true);
      return;
    }
    if (result.requiresReauthentication) {
      navigate("/login");
      return;
    }
    setFormValues((prev) => ({ ...prev, email: payload.email }));
    setSuccessMessage("Your profile has been updated.");
    setSelectedPhotoFile(null);
  };

  const countryDropdown = {
    containerRef: countryDropdownRef,
    isOpen: isCountryDropdownOpen,
    setIsOpen: setIsCountryDropdownOpen,
    searchValue: countrySearchValue,
    setSearchValue: setCountrySearchValue,
    filteredOptions: filteredCountryOptions,
  };
  const cityDropdown = {
    containerRef: cityDropdownRef,
    isOpen: isCityDropdownOpen,
    setIsOpen: setIsCityDropdownOpen,
    searchValue: citySearchValue,
    setSearchValue: setCitySearchValue,
    filteredOptions: filteredCityOptions,
  };
  const phoneCodeDropdown = {
    containerRef: phoneCodeDropdownRef,
    listRef: phoneCodeListRef,
    isOpen: isPhoneCodeDropdownOpen,
    setIsOpen: setIsPhoneCodeDropdownOpen,
    searchValue: phoneCodeSearchValue,
    setSearchValue: setPhoneCodeSearchValue,
    filteredOptions: filteredPhoneCodeOptions,
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section edit-profile-page">
          <div className="edit-profile-actions">
            <Link to={`/user/${currentUser.id}`} className="btn btn-light">My Profile</Link>
            {currentUser.isHost && (
              <Link to="/host-settings" className="btn btn-light">Host Settings</Link>
            )}
          </div>
          <div className="profile-name-row">
            <h2>{currentUser.fullName}</h2>
            {currentUser.isHost && (
              <Link to="/host-settings" className="verified-host-badge">
                ✅ Verified Host
              </Link>
            )}
          </div>

          <MyProfileForm
                formValues={formValues}
                setFormValues={setFormValues}
                selectedCountry={selectedCountry}
                selectedPhoneCodeCountry={selectedPhoneCodeCountry}
                profilePhoto={profilePhoto}
                photoInputRef={photoInputRef}
                countryDropdown={countryDropdown}
                cityDropdown={cityDropdown}
                phoneCodeDropdown={phoneCodeDropdown}
                errorMessage={errorMessage}
                invalidField={invalidField}
                onClearError={() => { setErrorMessage(""); setInvalidField(""); }}
                successMessage={successMessage}
                saveStatus={saveStatus}
                onInputChange={onInputChange}
                onLanguageChange={onLanguageChange}
                onSportChange={onSportChange}
                onPhotoSelect={onPhotoSelect}
                onSubmit={onSubmit}
          />
          {showEmailConfirmDialog && (
                <div className="modal-backdrop" role="presentation">
                  <div
                    className="modal-box"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="email-confirm-title"
                  >
                    <h3 className="modal-title" id="email-confirm-title">Email confirmation needed</h3>
                    <p className="modal-body-text">
                      Profile updated. Email confirmation needed for email to be updated. Check your email and confirm please.
                    </p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowEmailConfirmDialog(false)}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default MyProfilePage;
