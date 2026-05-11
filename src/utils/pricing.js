export const COMMISSION_RATE = 0.15;
export const TAX_RATE = 0.05;

export const CURRENCY_SYMBOLS = {
  // North & Central America
  USD: "$",     CAD: "C$",   MXN: "MX$",  GTQ: "Q",    BZD: "BZ$",
  HNL: "L",     NIO: "NIO",  CRC: "₡",    CUP: "CU$",  JMD: "J$",
  TTD: "TT$",   DOP: "RD$",  HTG: "G",
  // South America
  ARS: "AR$",   CLP: "CL$",  UYU: "$U",   PYG: "₲",    BOB: "Bs.",
  PEN: "S/",    COP: "CO$",  VES: "Bs.S", BRL: "R$",   GYD: "GY$",
  SRD: "Sr$",
  // Europe
  EUR: "€",     GBP: "£",    CHF: "Fr.",  NOK: "kr",   SEK: "SEK",
  DKK: "DKK",   ISK: "ISK",  CZK: "Kč",  PLN: "zł",   HUF: "Ft",
  RON: "lei",   BGN: "лв",   RSD: "din",  BAM: "KM",   MKD: "den",
  ALL: "L",     MDL: "MDL",  UAH: "₴",    BYN: "Br",   RUB: "₽",
  GEL: "₾",     TRY: "₺",
  // East Asia
  JPY: "¥",     CNY: "CN¥",  KRW: "₩",    KPW: "KP₩",  TWD: "NT$",
  HKD: "HK$",   MOP: "MOP",  MNT: "₮",
  // South & Southeast Asia
  INR: "₹",     PKR: "PKR",  BDT: "৳",    LKR: "LKR",  NPR: "रु",
  BTN: "Nu",    MVR: "Rf",   BND: "B$",   MYR: "RM",   SGD: "S$",
  IDR: "Rp",    PHP: "₱",    THB: "฿",    VND: "₫",    KHR: "៛",
  LAK: "₭",     MMK: "K",
  // Central Asia
  KZT: "₸",     UZS: "UZS",  KGS: "KGS",  TJS: "SM",   TMT: "T",
  AZN: "₼",     AMD: "֏",
  // Middle East
  AED: "AED",   SAR: "SR",   QAR: "QR",   KWD: "KD",   BHD: "BD",
  OMR: "OMR",   JOD: "JD",   ILS: "₪",    LBP: "L£",   SYP: "£S",
  IQD: "IQD",   IRR: "IRR",  YER: "YR",
  // Oceania
  AUD: "A$",    NZD: "NZ$",  FJD: "FJ$",  PGK: "PGK",
  // Africa
  ZAR: "R",     NGN: "₦",    KES: "KSh",  GHS: "₵",    EGP: "E£",
  MAD: "MAD",   DZD: "DA",   TND: "DT",   LYD: "LD",   ETB: "ETB",
  UGX: "USh",   TZS: "TSh",  RWF: "RF",   BIF: "BIF",  XOF: "CFA",
  XAF: "FCFA",  AOA: "Kz",   ZMW: "ZK",   MWK: "MK",   MZN: "MT",
  NAD: "N$",    BWP: "BWP",  SDG: "SDG",  SSP: "SS£",  ERN: "Nfk",
  SZL: "SZL",   LSL: "LSL",  LRD: "LRD",  SOS: "Sh",   GMD: "D",
  GNF: "FG",    MRU: "UM",   MUR: "MUR",  CVE: "CV$",  SLE: "Le",
  DJF: "DJF",   KMF: "KMF",  CDF: "FC",   MGA: "Ar",   AFN: "؋",
};

// Units of each currency equal to 1 XP (Normalized Spending Unit).
// Chosen as the round number closest to $1 USD at approximate 2025–2026 rates.
// Currencies not listed default to 1 (1 unit = 1 XP).
export const NSU_DIVISORS = {
  // North & Central America
  USD: 1,      CAD: 1,      MXN: 17,     GTQ: 8,      BZD: 2,
  HNL: 25,     NIO: 40,     CRC: 500,    CUP: 25,     JMD: 150,
  TTD: 7,      DOP: 60,     HTG: 130,
  // South America
  ARS: 1000,   CLP: 1000,   UYU: 40,     PYG: 8000,   BOB: 7,
  PEN: 4,      COP: 4000,   VES: 40,     BRL: 6,      GYD: 200,
  SRD: 40,
  // Europe
  EUR: 1,      GBP: 1,      CHF: 1,      NOK: 10,     SEK: 10,
  DKK: 7,      ISK: 140,    CZK: 25,     PLN: 4,      HUF: 400,
  RON: 5,      BGN: 2,      RSD: 110,    BAM: 2,      MKD: 60,
  ALL: 110,    MDL: 18,     UAH: 40,     BYN: 3,      RUB: 90,
  GEL: 3,      TRY: 40,
  // East Asia
  JPY: 100,    CNY: 7,      KRW: 1000,   KPW: 900,    TWD: 30,
  HKD: 8,      MOP: 8,      MNT: 3500,
  // South & Southeast Asia
  INR: 85,     PKR: 280,    BDT: 110,    LKR: 300,    NPR: 130,
  BTN: 85,     MVR: 15,     BND: 1,      MYR: 5,      SGD: 1,
  IDR: 16000,  PHP: 60,     THB: 35,     VND: 25000,  KHR: 4000,
  LAK: 22000,  MMK: 2000,
  // Central Asia
  KZT: 500,    UZS: 13000,  KGS: 90,     TJS: 10,     TMT: 4,
  AZN: 2,      AMD: 400,
  // Middle East
  AED: 4,      SAR: 4,      QAR: 4,      KWD: 1,      BHD: 1,
  OMR: 1,      JOD: 1,      ILS: 4,      LBP: 90000,  SYP: 13000,
  IQD: 1300,   IRR: 42000,  YER: 250,
  // Oceania
  AUD: 2,      NZD: 2,      FJD: 2,      PGK: 4,
  // Africa
  ZAR: 20,     NGN: 1600,   KES: 130,    GHS: 15,     EGP: 50,
  MAD: 10,     DZD: 130,    TND: 3,      LYD: 5,      ETB: 60,
  UGX: 4000,   TZS: 2500,   RWF: 1300,   BIF: 3000,   XOF: 600,
  XAF: 600,    AOA: 900,    ZMW: 25,     MWK: 2000,   MZN: 65,
  NAD: 20,     BWP: 15,     SDG: 600,    SSP: 2000,   ERN: 15,
  SZL: 20,     LSL: 20,     LRD: 200,    SOS: 600,    GMD: 70,
  GNF: 9000,   MRU: 40,     MUR: 45,     CVE: 110,    SLE: 23,
  DJF: 180,    KMF: 450,    CDF: 3000,   MGA: 4500,   AFN: 70,
};

export const toNSU = (amount, currency) => {
  const divisor = NSU_DIVISORS[String(currency).toUpperCase()] ?? 1;
  return Math.ceil((Number(amount) || 0) / divisor);
};

export const formatCurrency = (amount, currency) => {
  const sym = CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? currency;
  return `${sym}${Number(amount).toFixed(2)}`;
};
