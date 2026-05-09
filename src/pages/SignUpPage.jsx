import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SignUpForm from "../components/auth/SignUpForm";
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

const formatBirthdayFromDigits = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

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

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "",
  city: "",
  phoneCountryCode: "",
  phone: "",
  languages: ["", "", "", ""],
  sports: ["", "", "", ""],
  addressLine1: "",
  addressLine2: "",
  photo: "",
  birthday: "",
  gender: "Not Sharing",
  agreeTermsAndConditions: false,
  agreePromotionsAndMarketingEmails: false,
};

const SignUpPage = ({ currentUser, onLogout, onEmailSignUp, onSocialLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formValues, setFormValues] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const filteredCountryOptions = useMemo(() => {
    const search = countrySearchValue.trim().toLowerCase();
    if (!search) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) =>
      c.name.toLowerCase().includes(search)
    );
  }, [countrySearchValue]);

  const availableCities = useMemo(() => {
    if (!selectedCountry) return [];
    const cities = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (formValues.city && !cities.includes(formValues.city)) {
      return [formValues.city, ...cities];
    }
    return cities;
  }, [selectedCountry, formValues.city]);

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
    if (currentUser && pendingVerification) {
      const redirect =
        sessionStorage.getItem("postAuthRedirect") ||
        location.state?.from?.pathname ||
        "/";
      sessionStorage.removeItem("postAuthRedirect");
      navigate(redirect);
    }
  }, [currentUser, pendingVerification, navigate, location.state?.from?.pathname]);

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

  const onInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const next = name === "birthday" ? formatBirthdayFromDigits(value) : value;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : next,
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
    const reader = new FileReader();
    reader.onload = () =>
      setFormValues((prev) => ({ ...prev, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const onEmailSubmit = async (event) => {
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
    const dialCountry = formValues.phoneCountryCode
      ? COUNTRY_OPTIONS.find((c) => c.code === formValues.phoneCountryCode)
      : selectedCountry;
    if (!dialCountry) {
      setErrorMessage("Please select a valid phone area code.");
      return;
    }
    const phoneDigits = formValues.phone.trim().replace(/\D/g, "");
    const dialDigits = dialCountry.dialCode.replace(/\D/g, "");
    const localDigits = phoneDigits.startsWith(dialDigits)
      ? phoneDigits.slice(dialDigits.length)
      : phoneDigits;
    const normalizedBirthday = normalizeBirthdayInput(formValues.birthday);
    if (normalizedBirthday && !isValidBirthday(normalizedBirthday)) {
      setErrorMessage("Please enter a valid birthday in DD/MM/YYYY format.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    let result;
    try {
      result = await onEmailSignUp?.({
        firstName,
        lastName,
        fullName,
        email: formValues.email.trim().toLowerCase(),
        password: formValues.password,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        city: formValues.city.trim(),
        phoneCountryCode: dialCountry.code,
        countryDialCode: dialCountry.dialCode,
        phone: `${dialCountry.dialCode} ${localDigits}`.trim(),
        languages: formValues.languages.map((l) => l.trim()),
        sports: formValues.sports.map((s) => s.trim()),
        address: [
          formValues.addressLine1.trim(),
          formValues.addressLine2.trim(),
        ]
          .filter(Boolean)
          .join(", "),
        photo: formValues.photo,
        birthday: normalizedBirthday,
        gender: formValues.gender,
        agreedToTermsAndConditions: formValues.agreeTermsAndConditions,
        agreedToPromotionsAndMarketingEmails:
          formValues.agreePromotionsAndMarketingEmails,
      });
    } catch (e) {
      console.error("[signup] onEmailSignUp:", e);
      result = { success: false, message: "Sign up failed. Please try again." };
    } finally {
      setIsSubmitting(false);
    }

    if (!result?.success) {
      setErrorMessage(result?.message || "Sign up failed. Please try again.");
      return;
    }
    setPendingVerification({ email: formValues.email.trim().toLowerCase() });
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

        <main className="middle-section auth-page">
          <section className="auth-content">
            <h1>Create your account</h1>
            <p>
              Sign up with Google, Apple, or email. Phone is required for all
              verified accounts.
            </p>

            <div className="auth-social-grid">
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  const dest =
                    location.state?.from?.pathname ||
                    sessionStorage.getItem("postAuthRedirect") ||
                    "/";
                  if (dest && dest !== "/") sessionStorage.setItem("postAuthRedirect", dest);
                  onSocialLogin?.("google");
                }}
              >
                <svg className="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                className="btn btn-light social-btn"
                onClick={() => {
                  const dest =
                    location.state?.from?.pathname ||
                    sessionStorage.getItem("postAuthRedirect") ||
                    "/";
                  if (dest && dest !== "/") sessionStorage.setItem("postAuthRedirect", dest);
                  onSocialLogin?.("apple");
                }}
              >
                <svg className="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.18.8 1.21-.24 2.37-.93 3.67-.84 1.55.12 2.72.72 3.47 1.84-3.18 1.86-2.43 5.98.48 7.13-.57 1.39-1.32 2.76-2.8 3.95zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>

            {!pendingVerification ? (
              <SignUpForm
                formValues={formValues}
                setFormValues={setFormValues}
                selectedCountry={selectedCountry}
                selectedPhoneCodeCountry={selectedPhoneCodeCountry}
                countryDropdown={countryDropdown}
                cityDropdown={cityDropdown}
                phoneCodeDropdown={phoneCodeDropdown}
                errorMessage={errorMessage}
                isSubmitting={isSubmitting}
                onInputChange={onInputChange}
                onLanguageChange={onLanguageChange}
                onSportChange={onSportChange}
                onPhotoSelect={onPhotoSelect}
                onSubmit={onEmailSubmit}
              />
            ) : (
              <div className="verify-card">
                <h2>Check your email</h2>
                <p>
                  We sent a confirmation link to{" "}
                  <strong>{pendingVerification.email}</strong>.
                </p>
                <p>
                  Click the link in the email to activate your account. You will
                  be logged in automatically.
                </p>
              </div>
            )}

            <p className="auth-footnote">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default SignUpPage;
