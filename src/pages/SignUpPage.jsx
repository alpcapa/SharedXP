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
  const [invalidField, setInvalidField] = useState("");
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
    const err = (msg, field) => { setErrorMessage(msg); setInvalidField(field); };
    if (!formValues.firstName.trim()) return err("Please enter your first name.", "firstName");
    if (!formValues.lastName.trim()) return err("Please enter your last name.", "lastName");
    if (!formValues.email.trim()) return err("Please enter your email address.", "email");
    if (formValues.password.length < 8) return err("Password must be at least 8 characters.", "password");
    if (formValues.password !== formValues.confirmPassword) return err("Password confirmation does not match.", "confirmPassword");
    if (!formValues.addressLine1.trim()) return err("Please enter your address.", "addressLine1");
    if (!selectedCountry) return err("Please select a valid country from the list.", "country");
    if (!formValues.city.trim()) return err("Please select a valid city from the list.", "city-selector");
    if (!formValues.phone.trim()) return err("Please enter your phone number.", "phone");
    if (!formValues.languages[0].trim()) return err("Please select your native language.", "signup-language-0");
    if (!formValues.sports[0].trim()) return err("Please select your favorite sport.", "signup-sport-0");
    if (!formValues.agreeTermsAndConditions) return err("Please agree to Terms & Conditions to continue.", "agreeTermsAndConditions");

    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const dialCountry = formValues.phoneCountryCode
      ? COUNTRY_OPTIONS.find((c) => c.code === formValues.phoneCountryCode)
      : selectedCountry;
    if (!dialCountry) return err("Please select a valid phone area code.", "phone");
    const phoneDigits = formValues.phone.trim().replace(/\D/g, "");
    const dialDigits = dialCountry.dialCode.replace(/\D/g, "");
    const localDigits = phoneDigits.startsWith(dialDigits)
      ? phoneDigits.slice(dialDigits.length)
      : phoneDigits;
    const normalizedBirthday = normalizeBirthdayInput(formValues.birthday);
    if (normalizedBirthday && !isValidBirthday(normalizedBirthday)) return err("Please enter a valid birthday in DD/MM/YYYY format.", "birthday");

    setErrorMessage("");
    setInvalidField("");
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
              Sign up with your email. Phone is required for all verified accounts.
            </p>

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
                invalidField={invalidField}
                onClearError={() => { setErrorMessage(""); setInvalidField(""); }}
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
