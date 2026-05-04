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
};

export const formatCurrency = (amount, currency) => {
  const sym = CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? currency;
  return `${sym}${Number(amount).toFixed(2)}`;
};
