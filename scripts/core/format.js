// scripts/core/format.js
// Centrale formatteringshelpers voor bedragen en numerieke invoer.

/**
 * Formatteert een bedrag als een string zonder decimalen (bijv. 1234.56 -> "1.235").
 * @param {number|string} amount
 * @returns {string}
 */
export function formatAmount0(amount) {
  const n = Number(amount) || 0;
  if (isNaN(n)) return "0";
  // Rond af naar het dichtstbijzijnde hele getal en gebruik Nederlandse notatie
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(
    Math.round(n)
  );
}

/**
 * Formatteert een bedrag als een string met precies 2 decimalen (bijv. 1234.5 -> "1.234,50").
 * @param {number|string} amount
 * @returns {string}
 */
export function formatAmount2(amount) {
  const n = Number(amount) || 0;
  if (isNaN(n)) return "0,00";
  // Gebruik Nederlandse notatie met 2 decimalen
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Formatteert een numerieke waarde voor weergave in een inputveld
 * waarbij een punt als decimaalscheidingsteken wordt vervangen door een komma.
 * @param {number|string} value
 * @returns {string}
 */
export function formatNumberInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (isNaN(num)) return "";
  // Gebruikt Nederlandse decimaalnotatie (komma)
  return String(num).replace(".", ",");
}

/**
 * Parsed een string uit een inputveld terug naar een float, 
 * ongeacht of er een punt of komma als decimaalscheidingsteken is gebruikt.
 * @param {string} input
 * @returns {number}
 */
export function parseNumberInput(input) {
  if (typeof input !== "string") return NaN;
  // Vervang komma door punt en parse naar float
  return parseFloat(input.replace(/,/g, "."));
}
