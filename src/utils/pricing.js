export const COMMISSION_RATE = 0.15;
export const TAX_RATE = 0.05;

export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  INR: "₹",
  BRL: "R$",
  TRY: "₺",
  KRW: "₩",
};

// Units of each currency equal to 1 XP (Normalized Spending Unit).
// Currencies not listed default to 1 (1 unit = 1 XP).
export const NSU_DIVISORS = {
  USD: 1,
  EUR: 1,
  GBP: 1,
  CAD: 1,
  AUD: 1,
  JPY: 100,
  INR: 1,
  BRL: 1,
  TRY: 40,
  KRW: 1000,
};

export const toNSU = (amount, currency) => {
  const divisor = NSU_DIVISORS[String(currency).toUpperCase()] ?? 1;
  return Math.floor((Number(amount) || 0) / divisor);
};

export const formatCurrency = (amount, currency) => {
  const sym = CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? currency;
  return `${sym}${Number(amount).toFixed(2)}`;
};
