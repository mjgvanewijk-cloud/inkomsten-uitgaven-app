// scripts/core/sign.js
// Centrale logica voor banksaldo-kleuren (positief/negatief).

/**
 * Bepaalt de CSS-class voor een banksaldo.
 * - Positief: "ff-amount-positive"
 * - Negatief: "ff-amount-negative"
 * - 0 of niet-numeriek: geen class
 * @param {number|string} amount
 * @returns {string}
 */
export function bankSignClass(amount) {
  const n = Number(amount) || 0;
  if (n > 0) return "ff-amount-positive";
  if (n < 0) return "ff-amount-negative";
  return "";
}
