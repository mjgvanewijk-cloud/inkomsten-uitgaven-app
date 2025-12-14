// scripts/year/year-format.js
// Formatteringshelpers specifiek voor de jaarweergave.

import { formatAmount0 } from "./year-utils.js";
import { bankSignClass as coreBankSignClass } from "../core/sign.js";

/**
 * Formatteert een bedrag als "€ 1.234".
 * @param {number|string} amount
 * @returns {string}
 */
export function formatEuro(amount) {
  return `€ ${formatAmount0(amount)}`;
}

/**
 * Formatteert een bedrag zonder valuta-teken, maar wel met dezelfde afronding/logica.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatPlain(amount) {
  return formatAmount0(amount);
}

/**
 * Wrapper rond de centrale bankSignClass uit core/sign.js,
 * zodat de jaarmodule deze eenvoudig kan gebruiken.
 * @param {number|string} amount
 * @returns {string}
 */
export function bankSignClass(amount) {
  return coreBankSignClass(amount);
}
