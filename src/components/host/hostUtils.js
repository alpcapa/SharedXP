// Constants and pure helpers extracted from HostPage so the page itself is
// just orchestration (state + handlers + tab routing).

export const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "I'm Flexible"];
export const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL"];

export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
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
        }))
      : [createEmptySportConfig()];

  return {
    pauseHosting: existing.pauseHosting ?? false,
    bankDetailsComplete: existing.bankDetailsComplete ?? false,
    country: existing.country ?? user?.country ?? "",
    city:
      existing.city ?? user?.city ?? inferCityFromAddress(user?.address) ?? "",
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

export const validateSportsTab = (draft) => {
  if (!draft.country.trim()) return "Please choose your host country.";
  if (!draft.city.trim()) return "Please choose your host city.";
  const missingConsent = REQUIRED_HOST_CONSENTS.find(
    (c) => !draft.consents?.[c.field]
  );
  if (missingConsent) return missingConsent.message;

  const empty = createEmptySportConfig().availability;
  const invalidIndex = draft.sports.findIndex((s) => {
    const availability = s.availability ?? empty;
    return (
      !s.sport.trim() ||
      !s.description.trim() ||
      !s.about.trim() ||
      !s.pricing ||
      Number(s.pricing) < 1 ||
      !s.pricingCurrency.trim() ||
      !s.level.trim() ||
      (s.equipmentAvailable && !s.equipmentDetails.trim()) ||
      availability.days.length === 0 ||
      !availability.startTime ||
      !availability.endTime
    );
  });
  if (invalidIndex !== -1)
    return `Complete all required fields for Sport ${invalidIndex + 1}.`;

  const missingPhotoIndex = draft.sports.findIndex(
    (s) => s.images.length === 0
  );
  if (missingPhotoIndex !== -1)
    return `Please add at least one photo for Sport ${missingPhotoIndex + 1}.`;

  return "";
};

export const validatePaymentTab = (draft) => {
  const fields = [
    draft.stripe.stripeEmail,
    draft.stripe.accountHolderName,
    draft.stripe.citizenIdNumber,
    draft.stripe.taxNumber,
    draft.stripe.bankName,
    draft.stripe.accountNumber,
    draft.stripe.routingNumber,
    draft.stripe.payoutCurrency,
  ];
  if (fields.some((value) => !String(value ?? "").trim())) {
    return "Please complete all bank detail fields.";
  }
  return "";
};
