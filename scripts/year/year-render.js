// scripts/year/year-render.js
// Centrale "regisseur" voor de jaarweergave.
// Verzorgt alleen orkestratie: data via adapter, HTML via year-template, events via year-events.

import { loadSettings } from "../core/storage.js";
import { currentYear } from "../core/state.js";
import { getYearViewModel } from "../core/adapter.js";

import { createMonthRow, updateTotalsRow } from "./year-template.js";
import { attachYearTableEvents } from "./year-events.js";

/**
 * Rendert het volledige jaaroverzicht.
 * De visuele output is 1-op-1 gelijk aan de vorige implementatie.
 */
export function renderYear() {
  const settings = loadSettings();
  const year = currentYear;

  // Gebruik de adapter rond simulateYear(year)
  const view = getYearViewModel(year);
  const monthlyData = view.months || {};
  const yearlyInc = view.yearlyInc || 0;
  const yearlyExp = view.yearlyExp || 0;
  const yearlyFlow = view.yearlyFlow || 0;
  const lastBank = view.bankEnd || 0;
  const lastSaving = view.savingEnd || 0;

  // === TITEL ===
  const yearTitle = document.getElementById("yearTitle");
  if (yearTitle) yearTitle.textContent = year;

  // === TABEL BODY ===
  const tableBody = document.getElementById("yearTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // Bepaal start- en eindmaand identiek aan de oude nullish-logica
  let startMonthValue = 1;
  if (settings.startMonth && Object.prototype.hasOwnProperty.call(settings.startMonth, year)) {
    startMonthValue = settings.startMonth[year];
  }
  let endMonthValue = 12;
  if (settings.endMonth && Object.prototype.hasOwnProperty.call(settings.endMonth, year)) {
    endMonthValue = settings.endMonth[year];
  }

  const startMonth = startMonthValue ?? 1;
  const endMonth = endMonthValue ?? 12;


  for (let m = 1; m <= 12; m++) {
    const active = m >= startMonth && m <= endMonth;
    const row = createMonthRow(year, m, monthlyData[m], active);
    tableBody.appendChild(row);
  }

  // === TOTALEN RIJ ===
  const totalRow = document.getElementById("yearTotalRow");
  updateTotalsRow(totalRow, yearlyInc, yearlyExp, yearlyFlow, lastBank, lastSaving);

  // === CLICK HANDLERS ===
  attachYearTableEvents(tableBody, year);
}