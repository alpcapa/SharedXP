import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import HostSportTab from "../components/host/HostSportTab";
import HostPaymentTab from "../components/host/HostPaymentTab";
import { COUNTRY_OPTIONS } from "../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../data/countryCities";
import { supabase } from "../lib/supabase";
import {
  getInitialHostProfile,
  validatePaymentTab,
  validateSportsTab,
} from "../components/host/hostUtils";

const HostPage = ({ currentUser, onLogout, onSaveHostProfile, onTogglePauseHosting }) => {
  const location = useLocation();
  const isHostSettingsRoute = location.pathname === "/host-settings";

  const initialProfile = useMemo(
    () => getInitialHostProfile(currentUser),
    [currentUser]
  );
  const [hostProfileDraft, setHostProfileDraft] = useState(initialProfile);
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pauseWarning, setPauseWarning] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("sports");
  const [isSaving, setIsSaving] = useState(false);
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);

  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find(
        (c) =>
          c.name.toLowerCase() ===
          hostProfileDraft.country.trim().toLowerCase()
      ) ?? null,
    [hostProfileDraft.country]
  );

  const availableCities = useMemo(() => {
    if (!selectedCountry) return [];
    const cities = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (hostProfileDraft.city && !cities.includes(hostProfileDraft.city)) {
      return [hostProfileDraft.city, ...cities];
    }
    return cities;
  }, [selectedCountry, hostProfileDraft.city]);

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

  const isHostingPaused = Boolean(hostProfileDraft.pauseHosting);
  const isSportsTabComplete = validateSportsTab(hostProfileDraft) === "";
  const isPaymentTabComplete = hostProfileDraft.bankDetailsComplete === true;

  const onSaveSports = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    const validationError = validateSportsTab(hostProfileDraft);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }
    setIsSaving(true);
    const profileToSave = {
      ...hostProfileDraft,
      sports: hostProfileDraft.sports.map((s) => ({
        ...s,
        pricing: Number(s.pricing),
      })),
    };
    const result = await onSaveHostProfile?.(profileToSave);
    setIsSaving(false);
    if (result?.success === false) {
      setErrorMessage(result.message || "Failed to save. Please try again.");
      setSuccessMessage("");
    } else {
      setErrorMessage("");
      setSuccessMessage("Sport settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSavePayment = async (event) => {
    event.preventDefault();
    const validationError = validatePaymentTab(hostProfileDraft);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }
    const profileToSave = { ...hostProfileDraft, bankDetailsComplete: true };
    const result = await onSaveHostProfile?.(profileToSave);
    if (result?.success === false) {
      setErrorMessage(result.message || "Failed to save. Please try again.");
      setSuccessMessage("");
      return;
    }
    setHostProfileDraft((prev) => ({ ...prev, bankDetailsComplete: true }));
    setErrorMessage("");
    setSuccessMessage("Payment details saved successfully.");
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

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader
            currentUser={currentUser}
            onLogout={onLogout}
            hostingPausedOverride={isHostingPaused}
          />
        </section>
        <main className="middle-section simple-page host-settings-page">
          <div className="profile-back-wrap">
            <Link to="/user-profile" className="back-link">
              ← Back to My Profile
            </Link>
          </div>

          <div className="host-settings-top-bar">
            <div>
              <h1
                className={isHostingPaused ? "host-settings-title-paused" : ""}
              >
                {isHostingPaused ? "Hosting Paused" : "Host Settings"}
              </h1>
              <p>
                {isHostingPaused
                  ? "Hosting is currently paused. Resume hosting when you're ready."
                  : "Manage your sport offerings and payment details."}
              </p>
            </div>
            <div className="pause-hosting-group">
              <label className="hosting-pause-toggle" htmlFor="pauseHosting">
                <span>{isHostingPaused ? "Resume Hosting" : "Pause Hosting"}</span>
                <input
                  id="pauseHosting"
                  type="checkbox"
                  role="switch"
                  aria-checked={isHostingPaused}
                  checked={isHostingPaused}
                  onChange={async (event) => {
                    const newPaused = event.target.checked;
                    if (newPaused && currentUser?.id) {
                      const { data } = await supabase
                        .from("booking_requests")
                        .select("id")
                        .eq("host_id", currentUser.id)
                        .eq("status", "in_progress")
                        .limit(1);
                      if (data?.length > 0) {
                        setPauseWarning("You have an experience in progress. You can pause once it's completed.");
                        return;
                      }
                    }
                    setPauseWarning("");
                    setHostProfileDraft((prev) => ({ ...prev, pauseHosting: newPaused }));
                    onTogglePauseHosting?.(newPaused);
                  }}
                />
                <span className="hosting-pause-switch" aria-hidden="true" />
              </label>
              {pauseWarning && (
                <div className="pause-warning" role="alert">
                  <p className="pause-warning-text">{pauseWarning}</p>
                  <button
                    type="button"
                    className="pause-warning-ok"
                    onClick={() => setPauseWarning("")}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className="host-tab-bar"
            role="tablist"
            aria-label="Host settings sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sports"}
              className={`host-tab-btn${
                activeTab === "sports" ? " active" : ""
              }`}
              onClick={() => {
                setActiveTab("sports");
                setErrorMessage("");
                setSuccessMessage("");
              }}
            >
              Sport Setup
              {isSportsTabComplete ? (
                <span
                  className="host-tab-status host-tab-status-ok"
                  aria-label="complete"
                >
                  ✓
                </span>
              ) : (
                <span
                  className="host-tab-status host-tab-status-warn"
                  aria-label="incomplete"
                >
                  !
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "payment"}
              className={`host-tab-btn${
                activeTab === "payment" ? " active" : ""
              }`}
              onClick={() => {
                setActiveTab("payment");
                setErrorMessage("");
                setSuccessMessage("");
              }}
            >
              Payment Details
              {isPaymentTabComplete ? (
                <span
                  className="host-tab-status host-tab-status-ok"
                  aria-label="complete"
                >
                  ✓
                </span>
              ) : (
                <span
                  className="host-tab-status host-tab-status-warn"
                  aria-label="incomplete"
                >
                  !
                </span>
              )}
            </button>
          </div>

          {activeTab === "sports" && (
            <HostSportTab
              draft={hostProfileDraft}
              setDraft={setHostProfileDraft}
              activeSportIndex={activeSportIndex}
              setActiveSportIndex={setActiveSportIndex}
              errorMessage={errorMessage}
              successMessage={successMessage}
              setErrorMessage={setErrorMessage}
              setSuccessMessage={setSuccessMessage}
              countryDropdown={countryDropdown}
              cityDropdown={cityDropdown}
              onSubmit={onSaveSports}
              isSaving={isSaving}
            />
          )}

          {activeTab === "payment" && (
            <HostPaymentTab
              draft={hostProfileDraft}
              setDraft={setHostProfileDraft}
              isPaymentTabComplete={isPaymentTabComplete}
              errorMessage={errorMessage}
              successMessage={successMessage}
              onSubmit={onSavePayment}
            />
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HostPage;
