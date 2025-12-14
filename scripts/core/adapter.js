// scripts/core/adapter.js
// Adapter rond simulateYear zodat de UI een consistente datastructuur krijgt.

import { simulateYear } from "./state.js";

/**
 * Berekent een viewmodel voor het jaaroverzicht op basis van simulateYear(year).
 * Wijzigt simulateYear zelf niet.
 * @param {number} year
 * @returns {{
 *   year: number,
 *   months: Record<number, { income: number, expense: number, savingFlow: number, bank: number, saving: number }>,
 *   yearlyInc: number,
 *   yearlyExp: number,
 *   yearlyFlow: number,
 *   bankEnd: number,
 *   savingEnd: number
 * }}
 */
export function getYearViewModel(year) {
  const sim = simulateYear(year) || {};
  const monthsArr = Array.isArray(sim.months) ? sim.months : [];

  const monthlyData = {};
  let yearlyInc = 0;
  let yearlyExp = 0;
  let yearlyFlow = 0;

  for (const mObj of monthsArr) {
    if (!mObj) continue;

    const m = Number(mObj.month);
    if (!m || m < 1 || m > 12) continue;

    const inc = Number(mObj.income) || 0;
    const exp = Number(mObj.expense) || 0;
    const flow = Number(mObj.monthSaving) || 0;

    yearlyInc += inc;
    yearlyExp += exp;
    yearlyFlow += flow;

    monthlyData[m] = {
      income: inc,
      expense: exp,
      savingFlow: flow,
      bank: Number(mObj.bankEnd) || 0,
      saving: Number(mObj.savingEnd) || 0,
    };
  }

  const bankEnd = Number(sim.bankEnd) || 0;
  const savingEnd = Number(sim.savingEnd) || 0;

  return {
    year,
    months: monthlyData,
    yearlyInc,
    yearlyExp,
    yearlyFlow,
    bankEnd,
    savingEnd,
  };
}
