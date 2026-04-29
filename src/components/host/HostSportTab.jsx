import { Link } from "react-router-dom";
import { SPORT_OPTIONS } from "../../data/sports";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../../data/countryCities";
import {
  AVAILABILITY_DAYS,
  CURRENCY_OPTIONS,
  LEVEL_OPTIONS,
  TIME_OPTIONS,
  createEmptySportConfig,
  getCountryFlag,
} from "./hostUtils";

const HostSportTab = ({
  draft,
  setDraft,
  activeSportIndex,
  setActiveSportIndex,
  errorMessage,
  successMessage,
  setErrorMessage,
  setSuccessMessage,
  countryDropdown,
  cityDropdown,
  onSubmit,
}) => {
  const activeSport =
    draft.sports[activeSportIndex] ?? createEmptySportConfig();

  const selectedCountry =
    COUNTRY_OPTIONS.find(
      (c) => c.name.toLowerCase() === draft.country.trim().toLowerCase()
    ) ?? null;

  const updateSportField = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) =>
        i === activeSportIndex ? { ...s, [field]: value } : s
      ),
    }));
  };

  const updateConsentField = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      consents: { ...prev.consents, [field]: value },
    }));
  };

  const updateEquipmentAvailability = (isAvailable) => {
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) =>
        i === activeSportIndex ? { ...s, equipmentAvailable: isAvailable } : s
      ),
    }));
  };

  const toggleAvailabilityDay = (day) => {
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) => {
        if (i !== activeSportIndex) return s;
        const days = s.availability.days;
        const next = days.includes(day)
          ? days.filter((d) => d !== day)
          : [...days, day];
        return { ...s, availability: { ...s.availability, days: next } };
      }),
    }));
  };

  const updateAvailabilityTime = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) =>
        i === activeSportIndex
          ? { ...s, availability: { ...s.availability, [field]: value } }
          : s
      ),
    }));
  };

  const removeSport = (sportIndex) => {
    if (!window.confirm("Are you sure you want to delete this sport?")) return;

    if (draft.sports.length <= 1) {
      setDraft((prev) => ({
        ...prev,
        sports: [createEmptySportConfig()],
      }));
      setActiveSportIndex(0);
    } else {
      const next = draft.sports.filter((_, i) => i !== sportIndex);
      setDraft((prev) => ({ ...prev, sports: next }));
      setActiveSportIndex((prev) => {
        if (sportIndex < prev) return prev - 1;
        if (sportIndex === prev) return Math.min(prev, next.length - 1);
        return prev;
      });
    }
    setErrorMessage("");
    setSuccessMessage("");
  };

  const addSport = () => {
    setDraft((prev) => ({
      ...prev,
      sports: [...prev.sports, createEmptySportConfig()],
    }));
    setActiveSportIndex(draft.sports.length);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const onSportImageSelect = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          })
      )
    );
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) =>
        i === activeSportIndex ? { ...s, images: [...s.images, ...dataUrls] } : s
      ),
    }));
    event.target.value = "";
  };

  const removeSportImage = (imageIndex) => {
    setDraft((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) =>
        i === activeSportIndex
          ? { ...s, images: s.images.filter((_, idx) => idx !== imageIndex) }
          : s
      ),
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      <section className="host-onboarding-card">
        <div className="host-sport-header">
          <h2>Sport Setup</h2>
          <button
            type="button"
            className="btn host-add-sport-button"
            onClick={addSport}
          >
            Add Sport
          </button>
        </div>
        <div
          className="host-sport-tabs"
          role="tablist"
          aria-label="Host sports tabs"
        >
          {draft.sports.map((s, index) => (
            <div key={`sport-tab-${index}`} className="host-sport-tab-wrap">
              <button
                type="button"
                role="tab"
                aria-selected={activeSportIndex === index}
                className={`host-sport-tab${
                  activeSportIndex === index ? " active" : ""
                }`}
                onClick={() => setActiveSportIndex(index)}
              >
                {s.sport || `Sport ${index + 1}`}
              </button>
              <button
                type="button"
                className="host-sport-delete"
                aria-label={`Delete ${s.sport || `Sport ${index + 1}`}`}
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
            onChange={(e) => updateSportField("sport", e.target.value)}
          >
            <option value="">Select sport</option>
            {SPORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
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
            onChange={(e) => updateSportField("description", e.target.value)}
          />
          <p className="host-field-hint">
            {activeSport.description.length}/50
          </p>

          <label htmlFor="sportAbout">About</label>
          <textarea
            id="sportAbout"
            required
            rows={4}
            placeholder="Share your bio and hosting style"
            value={activeSport.about}
            onChange={(e) => updateSportField("about", e.target.value)}
          />

          <label htmlFor="sportPricing">
            How much do you charge per session?
          </label>
          <div className="host-price-row">
            <input
              id="sportPricing"
              type="number"
              min="1"
              step="1"
              required
              placeholder="How much do you charge per session?"
              value={activeSport.pricing}
              onChange={(e) => updateSportField("pricing", e.target.value)}
            />
            <select
              aria-label="Pricing currency"
              required
              value={activeSport.pricingCurrency}
              onChange={(e) =>
                updateSportField("pricingCurrency", e.target.value)
              }
            >
              <option value="">Currency</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <label htmlFor="sportLevel">Level</label>
          <select
            id="sportLevel"
            required
            value={activeSport.level}
            onChange={(e) => updateSportField("level", e.target.value)}
          >
            <option value="">Select level</option>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <label>Equipment Availability</label>
          <div
            className="host-toggle-group"
            role="radiogroup"
            aria-label="Equipment availability"
          >
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
            onChange={(e) =>
              updateSportField("equipmentDetails", e.target.value)
            }
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
                onChange={(e) =>
                  updateAvailabilityTime("startTime", e.target.value)
                }
              >
                <option value="">Select start time</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={`start-${t}`} value={t}>
                    {t}
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
                onChange={(e) =>
                  updateAvailabilityTime("endTime", e.target.value)
                }
              >
                <option value="">Select end time</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={`end-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="host-images-block">
          <h3>
            Photo Gallery{" "}
            <span className="host-field-required" aria-hidden="true">
              *
            </span>
          </h3>
          <input
            id="hostPhotoUpload"
            className="history-photo-upload-input"
            type="file"
            accept="image/*"
            multiple
            onChange={onSportImageSelect}
          />
          <label
            className="history-photo-upload-label"
            htmlFor="hostPhotoUpload"
          >
            Upload photos
          </label>
          <span className="host-photo-upload-hint">
            At least one photo is required. You can select multiple at once.
          </span>
          {activeSport.images.length === 0 && (
            <p className="host-photo-required-hint" role="alert">
              Please add at least one photo to continue.
            </p>
          )}
          {activeSport.images.length > 0 && (
            <div className="host-image-grid">
              {activeSport.images.map((src, imageIndex) => (
                <div key={imageIndex} className="host-image-item">
                  <img
                    src={src}
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
        <h2>Your Location</h2>
        <div className="host-form-grid">
          <label id="host-country-label" htmlFor="host-country-selector">
            Country
          </label>
          <div
            className="auth-search-dropdown"
            ref={countryDropdown.containerRef}
          >
            <button
              id="host-country-selector"
              type="button"
              className="auth-dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded={countryDropdown.isOpen}
              aria-controls="host-country-listbox"
              onClick={() => {
                countryDropdown.setIsOpen((prev) => !prev);
                countryDropdown.setSearchValue("");
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
            {countryDropdown.isOpen && (
              <div className="auth-dropdown-panel">
                <input
                  type="search"
                  className="auth-dropdown-search"
                  placeholder="Search country"
                  value={countryDropdown.searchValue}
                  onChange={(e) => countryDropdown.setSearchValue(e.target.value)}
                />
                <ul
                  id="host-country-listbox"
                  className="auth-dropdown-options"
                  role="listbox"
                  aria-labelledby="host-country-label"
                >
                  {countryDropdown.filteredOptions.map((option) => (
                    <li key={option.code}>
                      <button
                        type="button"
                        className="auth-dropdown-option"
                        role="option"
                        aria-selected={selectedCountry?.code === option.code}
                        onClick={() => {
                          const nextCities =
                            COUNTRY_CITY_OPTIONS[option.code] ?? [];
                          setDraft((prev) => ({
                            ...prev,
                            country: option.name,
                            city: nextCities[0] ?? "",
                          }));
                          countryDropdown.setIsOpen(false);
                        }}
                      >
                        <span>{getCountryFlag(option.code)}</span>
                        <span>{option.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <label id="host-city-label" htmlFor="host-city-selector">
            City
          </label>
          <div className="auth-search-dropdown" ref={cityDropdown.containerRef}>
            <button
              id="host-city-selector"
              type="button"
              className="auth-dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded={cityDropdown.isOpen}
              aria-controls="host-city-listbox"
              disabled={!selectedCountry}
              onClick={() => {
                cityDropdown.setIsOpen((prev) => !prev);
                cityDropdown.setSearchValue("");
              }}
            >
              {draft.city || "Select city"}
            </button>
            {cityDropdown.isOpen && (
              <div className="auth-dropdown-panel">
                <input
                  type="search"
                  className="auth-dropdown-search"
                  placeholder="Search city"
                  value={cityDropdown.searchValue}
                  onChange={(e) => cityDropdown.setSearchValue(e.target.value)}
                />
                <ul
                  id="host-city-listbox"
                  className="auth-dropdown-options"
                  role="listbox"
                  aria-labelledby="host-city-label"
                >
                  {cityDropdown.filteredOptions.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        className="auth-dropdown-option"
                        role="option"
                        aria-selected={draft.city === option}
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, city: option }));
                          cityDropdown.setIsOpen(false);
                        }}
                      >
                        <span>{option}</span>
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
          <label
            className="form-consent-option"
            htmlFor="hostAgreeTermsAndConditions"
          >
            <input
              id="hostAgreeTermsAndConditions"
              type="checkbox"
              checked={draft.consents?.agreeTermsAndConditions ?? false}
              onChange={(e) =>
                updateConsentField("agreeTermsAndConditions", e.target.checked)
              }
            />
            <span>
              I agree to{" "}
              <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
            </span>
          </label>
          <label
            className="form-consent-option"
            htmlFor="hostAgreeHostingRelatedEmailsAndCalls"
          >
            <input
              id="hostAgreeHostingRelatedEmailsAndCalls"
              type="checkbox"
              checked={
                draft.consents?.agreeHostingRelatedEmailsAndCalls ?? false
              }
              onChange={(e) =>
                updateConsentField(
                  "agreeHostingRelatedEmailsAndCalls",
                  e.target.checked
                )
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
              checked={
                draft.consents?.agreePromotionsAndMarketingEmails ?? false
              }
              onChange={(e) =>
                updateConsentField(
                  "agreePromotionsAndMarketingEmails",
                  e.target.checked
                )
              }
            />
            <span>I agree to receive Promotions &amp; Marketing emails</span>
          </label>
        </div>
      </section>

      {errorMessage && <p className="auth-error">{errorMessage}</p>}
      {successMessage && (
        <p className="host-success-message">{successMessage}</p>
      )}

      <button type="submit" className="btn btn-primary" disabled={isSaving}>
  {isSaving ? "Saving..." : "Save Sport Settings"}
</button>

    </form>
  );
};

export default HostSportTab;
