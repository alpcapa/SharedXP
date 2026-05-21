// Constants and pure helpers extracted from HostPage so the page itself is
// just orchestration (state + handlers + tab routing).

export const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "I'm Flexible"];
export const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const CURRENCY_OPTIONS = [
  // Americas
  "USD", "CAD", "MXN", "GTQ", "BZD", "HNL", "NIO", "CRC", "CUP", "JMD",
  "TTD", "DOP", "HTG", "ARS", "CLP", "UYU", "PYG", "BOB", "PEN", "COP",
  "VES", "BRL", "GYD", "SRD",
  // Europe
  "EUR", "GBP", "CHF", "NOK", "SEK", "DKK", "ISK", "CZK", "PLN", "HUF",
  "RON", "BGN", "RSD", "BAM", "MKD", "ALL", "MDL", "UAH", "BYN", "RUB",
  "GEL", "TRY",
  // East Asia
  "JPY", "CNY", "KRW", "KPW", "TWD", "HKD", "MOP", "MNT",
  // South & Southeast Asia
  "INR", "PKR", "BDT", "LKR", "NPR", "BTN", "MVR", "BND", "MYR", "SGD",
  "IDR", "PHP", "THB", "VND", "KHR", "LAK", "MMK",
  // Central Asia
  "KZT", "UZS", "KGS", "TJS", "TMT", "AZN", "AMD",
  // Middle East
  "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "LBP", "SYP",
  "IQD", "IRR", "YER",
  // Oceania
  "AUD", "NZD", "FJD", "PGK",
  // Africa
  "ZAR", "NGN", "KES", "GHS", "EGP", "MAD", "DZD", "TND", "LYD", "ETB",
  "UGX", "TZS", "RWF", "BIF", "XOF", "XAF", "AOA", "ZMW", "MWK", "MZN",
  "NAD", "BWP", "SDG", "SSP", "ERN", "SZL", "LSL", "LRD", "SOS", "GMD",
  "GNF", "MRU", "MUR", "CVE", "SLE", "DJF", "KMF", "CDF", "MGA", "AFN",
];

export const TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const hours = String(index).padStart(2, "0");
  return `${hours}:00`;
});

const REGIONAL_INDICATOR_OFFSET = 127397;
export const getCountryFlag = (countryCode) =>
  String(countryCode || "")
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0))
    );

export const REQUIRED_HOST_CONSENTS = [
  {
    field: "agreeTermsAndConditions",
    message: "Please agree to Terms & Conditions.",
  },
  {
    field: "agreeHostingRelatedEmailsAndCalls",
    message: "Please agree to receive hosting related emails and calls.",
  },
];

export const createEmptySportConfig = () => ({
  sport: "",
  description: "",
  about: "",
  pricing: "",
  pricingCurrency: "",
  level: "",
  paused: false,
  equipmentAvailable: false,
  equipmentDetails: "",
  availability: { days: [], startTime: "", endTime: "" },
  images: [],
  cancellationPolicy: "flexible",
});

export const inferCityFromAddress = (address) => {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[1] : parts[0] ?? "";
};

export const getInitialHostProfile = (user) => {
  const existing = user?.hostProfile ?? {};
  const existingSports =
    Array.isArray(existing.sports) && existing.sports.length > 0
      ? existing.sports.map((sportConfig) => ({
          ...createEmptySportConfig(),
          ...sportConfig,
          availability: {
            ...createEmptySportConfig().availability,
            ...(sportConfig.availability ?? {}),
          },
          images: Array.isArray(sportConfig.images) ? sportConfig.images : [],
          cancellationPolicy: sportConfig.cancellationPolicy ?? "flexible",
        }))
      : [createEmptySportConfig()];

  return {
    pauseHosting: existing.pauseHosting ?? false,
    bankDetailsComplete: existing.bankDetailsComplete ?? false,
    country: existing.country ?? user?.country ?? "",
    city:
      existing.city ?? user?.city ?? inferCityFromAddress(user?.address) ?? "",
    postcode: existing.postcode ?? "",
    stripe: {
      stripeEmail: existing.stripe?.stripeEmail ?? user?.email ?? "",
      accountHolderName:
        existing.stripe?.accountHolderName ?? user?.fullName ?? "",
      citizenIdNumber: existing.stripe?.citizenIdNumber ?? "",
      taxNumber: existing.stripe?.taxNumber ?? "",
      bankName: existing.stripe?.bankName ?? "",
      accountNumber: existing.stripe?.accountNumber ?? "",
      routingNumber: existing.stripe?.routingNumber ?? "",
      payoutCurrency: existing.stripe?.payoutCurrency ?? "",
    },
    consents: {
      agreeTermsAndConditions:
        existing.consents?.agreeTermsAndConditions ?? false,
      agreePromotionsAndMarketingEmails:
        existing.consents?.agreePromotionsAndMarketingEmails ?? false,
      agreeHostingRelatedEmailsAndCalls:
        existing.consents?.agreeHostingRelatedEmailsAndCalls ?? false,
    },
    sports: existingSports,
  };
};

// Returns { message, sportIndex } where sportIndex is the 0-based index of the
// failing sport (null for non-sport errors). Callers can auto-switch to the
// failing sport tab and scroll to the error.
export const validateSportsTab = (draft) => {
  if (!draft.country.trim()) return { message: "Please choose your host country.", sportIndex: null, fieldId: "host-country-selector" };
  if (!draft.city.trim()) return { message: "Please choose your host city.", sportIndex: null, fieldId: "host-city-selector" };
  const missingConsent = REQUIRED_HOST_CONSENTS.find(
    (c) => !draft.consents?.[c.field]
  );
  if (missingConsent) return { message: missingConsent.message, sportIndex: null, fieldId: missingConsent.field === "agreeTermsAndConditions" ? "hostAgreeTermsAndConditions" : "hostAgreeHostingRelatedEmailsAndCalls" };

  const empty = createEmptySportConfig().availability;
  for (let i = 0; i < draft.sports.length; i++) {
    const s = draft.sports[i];
    const label = s.sport || `Sport ${i + 1}`;
    const availability = s.availability ?? empty;
    if (!s.sport.trim()) return { message: `Please select a sport for Sport ${i + 1}.`, sportIndex: i, fieldId: "sportType" };
    if (!s.description.trim()) return { message: `Please add a description for ${label}.`, sportIndex: i, fieldId: "sportDescription" };
    if (!s.about.trim()) return { message: `Please add an "About" bio for ${label}.`, sportIndex: i, fieldId: "sportAbout" };
    if (!s.pricing || Number(s.pricing) < 1) return { message: `Please set a price (at least 1) for ${label}.`, sportIndex: i, fieldId: "sportPricing" };
    if (!s.pricingCurrency.trim()) return { message: `Please select a pricing currency for ${label}.`, sportIndex: i, fieldId: "sportPricingCurrency" };
    if (!s.level.trim()) return { message: `Please select a level for ${label}.`, sportIndex: i, fieldId: "sportLevel" };
    if (s.equipmentAvailable && !s.equipmentDetails.trim()) return { message: `Please describe the equipment you provide for ${label}.`, sportIndex: i, fieldId: "equipmentDetails" };
    if (availability.days.length === 0) return { message: `Please select at least one availability day for ${label}.`, sportIndex: i, fieldId: "host-availability-days" };
    if (!availability.startTime) return { message: `Please set an availability start time for ${label}.`, sportIndex: i, fieldId: "availabilityStart" };
    if (!availability.endTime) return { message: `Please set an availability end time for ${label}.`, sportIndex: i, fieldId: "availabilityEnd" };
  }

  const missingPhotoIndex = draft.sports.findIndex(
    (s) => s.images.length === 0
  );
  if (missingPhotoIndex !== -1)
    return { message: `Please add at least one photo for Sport ${missingPhotoIndex + 1}.`, sportIndex: missingPhotoIndex, fieldId: "hostPhotoUpload" };

  return { message: "", sportIndex: null, fieldId: null };
};

export const validatePaymentTab = (draft) => {
  const checks = [
    [draft.stripe.stripeEmail, "Please enter your Stripe email.", "stripeEmail"],
    [draft.stripe.accountHolderName, "Please enter the account holder name.", "accountHolderName"],
    [draft.stripe.citizenIdNumber, "Please enter your citizen ID number.", "citizenIdNumber"],
    [draft.stripe.taxNumber, "Please enter your tax number.", "taxNumber"],
    [draft.stripe.bankName, "Please enter your bank name.", "bankName"],
    [draft.stripe.accountNumber, "Please enter your account number / IBAN.", "accountNumber"],
    [draft.stripe.routingNumber, "Please enter your routing number / SWIFT.", "routingNumber"],
    [draft.stripe.payoutCurrency, "Please select a payout currency.", "payoutCurrency"],
  ];
  for (const [value, message, fieldId] of checks) {
    if (!String(value ?? "").trim()) return { message, fieldId };
  }
  return { message: "", fieldId: null };
};
