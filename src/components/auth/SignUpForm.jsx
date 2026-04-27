import { Link } from "react-router-dom";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../../data/countryCities";
import { SPORT_OPTIONS } from "../../data/sports";

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
  "Urdu",
];
const LANGUAGE_SLOT_LABELS = ["Native", "Add new", "Add new", "Add new"];
const SPORT_SLOT_LABELS = ["Favorite", "Add new", "Add new", "Add new"];
const REGIONAL_INDICATOR_OFFSET = 127397;
const BIRTHDAY_PATTERN_SOURCE =
  "(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/\\d{4}";

const getCountryFlag = (code) =>
  String(code || "")
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0))
    );

const SignUpForm = ({
  formValues,
  setFormValues,
  selectedCountry,
  selectedPhoneCodeCountry,
  countryDropdown,
  cityDropdown,
  phoneCodeDropdown,
  errorMessage,
  isSubmitting,
  onInputChange,
  onLanguageChange,
  onSportChange,
  onPhotoSelect,
  onSubmit,
}) => (
  <form className="auth-form" onSubmit={onSubmit}>
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
    <div className="auth-search-dropdown" ref={countryDropdown.containerRef}>
      <button
        id="country"
        type="button"
        className="auth-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={countryDropdown.isOpen}
        aria-controls="country-listbox"
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
            id="country-listbox"
            className="auth-dropdown-options"
            role="listbox"
            aria-labelledby="country-label"
          >
            {countryDropdown.filteredOptions.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  className="auth-dropdown-option"
                  role="option"
                  aria-selected={selectedCountry?.code === option.code}
                  onClick={() => {
                    const nextCities = COUNTRY_CITY_OPTIONS[option.code] ?? [];
                    setFormValues((prev) => ({
                      ...prev,
                      country: option.name,
                      city: nextCities.includes(prev.city)
                        ? prev.city
                        : nextCities[0] || "",
                      phoneCountryCode: option.code,
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

    <label id="city-label" htmlFor="city-selector">
      City
    </label>
    <div className="auth-search-dropdown" ref={cityDropdown.containerRef}>
      <button
        id="city-selector"
        type="button"
        className="auth-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={cityDropdown.isOpen}
        aria-controls="city-listbox"
        disabled={!selectedCountry}
        onClick={() => {
          cityDropdown.setIsOpen((prev) => !prev);
          cityDropdown.setSearchValue("");
        }}
      >
        {formValues.city || "Select city"}
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
            id="city-listbox"
            className="auth-dropdown-options"
            role="listbox"
            aria-labelledby="city-label"
          >
            {cityDropdown.filteredOptions.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  className="auth-dropdown-option"
                  role="option"
                  aria-selected={formValues.city === option}
                  onClick={() => {
                    setFormValues((prev) => ({ ...prev, city: option }));
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

    <label id="phone-label" htmlFor="phone">
      Phone
    </label>
    <div className="auth-phone-field">
      <div
        className="auth-search-dropdown auth-phone-code-picker"
        ref={phoneCodeDropdown.containerRef}
      >
        <button
          type="button"
          className="auth-dropdown-trigger auth-phone-code-trigger"
          aria-haspopup="listbox"
          aria-expanded={phoneCodeDropdown.isOpen}
          aria-controls="phone-code-listbox"
          onClick={() => {
            phoneCodeDropdown.setIsOpen((prev) => !prev);
            phoneCodeDropdown.setSearchValue("");
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
        {phoneCodeDropdown.isOpen && (
          <div className="auth-dropdown-panel">
            <input
              type="search"
              className="auth-dropdown-search"
              placeholder="Search country or code"
              value={phoneCodeDropdown.searchValue}
              onChange={(e) =>
                phoneCodeDropdown.setSearchValue(e.target.value)
              }
            />
            <ul
              id="phone-code-listbox"
              className="auth-dropdown-options"
              role="listbox"
              aria-labelledby="phone-label"
              ref={phoneCodeDropdown.listRef}
            >
              {phoneCodeDropdown.filteredOptions.map((option) => (
                <li key={`phone-code-${option.code}`}>
                  <button
                    type="button"
                    className="auth-dropdown-option"
                    data-country-code={option.code}
                    role="option"
                    aria-selected={
                      selectedPhoneCodeCountry?.code === option.code
                    }
                    onClick={() => {
                      setFormValues((prev) => ({
                        ...prev,
                        phoneCountryCode: option.code,
                      }));
                      phoneCodeDropdown.setIsOpen(false);
                    }}
                  >
                    <span>{getCountryFlag(option.code)}</span>
                    <span>
                      {option.name} ({option.dialCode})
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
    <input
      id="photo"
      name="photo"
      type="file"
      accept="image/*"
      onChange={onPhotoSelect}
    />
    {formValues.photo && (
      <img
        src={formValues.photo}
        alt="Selected profile"
        className="auth-photo-preview"
      />
    )}

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
    <select
      id="gender"
      name="gender"
      value={formValues.gender}
      onChange={onInputChange}
    >
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Not Sharing">Not Sharing</option>
    </select>

    <label htmlFor="signup-language-0">Language</label>
    <div className="auth-language-row">
      {LANGUAGE_SLOT_LABELS.map((slotLabel, languageIndex) => (
        <select
          key={`signup-language-${languageIndex}`}
          id={`signup-language-${languageIndex}`}
          aria-label={`Language ${slotLabel}`}
          value={formValues.languages[languageIndex] ?? ""}
          onChange={(e) => onLanguageChange(languageIndex, e.target.value)}
          required={languageIndex === 0}
        >
          <option value="" disabled>
            {slotLabel}
          </option>
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ))}
    </div>

    <label htmlFor="signup-sport-0">Sports</label>
    <div className="auth-language-row">
      {SPORT_SLOT_LABELS.map((slotLabel, sportIndex) => (
        <select
          key={`signup-sport-${sportIndex}`}
          id={`signup-sport-${sportIndex}`}
          aria-label={`Sport ${slotLabel}`}
          value={formValues.sports[sportIndex] ?? ""}
          onChange={(e) => onSportChange(sportIndex, e.target.value)}
          required={sportIndex === 0}
        >
          <option value="" disabled>
            {slotLabel}
          </option>
          {SPORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ))}
    </div>

    <div className="form-consent-group">
      <label
        className="form-consent-option"
        htmlFor="agreeTermsAndConditions"
      >
        <input
          id="agreeTermsAndConditions"
          name="agreeTermsAndConditions"
          type="checkbox"
          checked={formValues.agreeTermsAndConditions}
          onChange={onInputChange}
        />
        <span>
          I agree to{" "}
          <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
        </span>
      </label>
      <label
        className="form-consent-option"
        htmlFor="agreePromotionsAndMarketingEmails"
      >
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
    <button
      type="submit"
      className="btn btn-primary auth-submit"
      disabled={isSubmitting}
    >
      {isSubmitting ? "Creating account…" : "Continue"}
    </button>
  </form>
);

export default SignUpForm;
