// scripts/year/year-storage.js
// Logica voor het verwerken, opslaan en valideren van jaarlijkse beginsaldi, en spaar-/limietinstellingen.

import { loadSettings, saveSettings } from "../core/storage.js";
import { simulateYear, resetCaches } from "../core/state.js";
import { formatNumberInput } from "./year-utils.js";

/**
 * Zoekt het eerstvolgende jaar na 'newYear' waarvoor een startsaldo is ingesteld.
 * @param {object} settings - De geladen instellingen.
 * @param {number} newYear - Het jaar om vanaf te zoeken.
 * @returns {number|null} Het eerstvolgende jaar of null.
 */
export function findLaterStartYear(settings, newYear) {
  if (!settings || typeof settings !== "object") return null;

  let candidate = null;

  const consider = (y) => {
    if (Number.isNaN(y)) return;
    if (y <= newYear) return;
    if (candidate === null || y < candidate) {
      candidate = y;
    }
  };

  // Check startmaand-instellingen
  if (settings.startMonth && typeof settings.startMonth === "object") {
    for (const yStr of Object.keys(settings.startMonth)) {
      const yNum = parseInt(yStr, 10);
      if (!Number.isNaN(yNum)) {
        consider(yNum);
      }
    }
  }

  // Check expliciete bank beginsaldi
  if (settings.yearBankStarting && typeof settings.yearBankStarting === "object") {
    for (const yStr of Object.keys(settings.yearBankStarting)) {
      const yNum = parseInt(yStr, 10);
      if (!Number.isNaN(yNum)) {
        consider(yNum);
      }
    }
  }

  return candidate;
}

/**
 * Handler voor Blur/verlies van focus op het Spaarrekening Beginsaldo veld.
 * Wordt gebruikt in de jaarinstellingen pop-up of wizard.
 * @param {number} currentYear - Het huidige jaar.
 * @param {function} onDataChanged - Callback om de UI te verversen.
 */
export function handleSavingsBlur(currentYear, onDataChanged) {
  const sInput = document.getElementById("startingSavingsInput");
  if (!sInput) return;

  const settings = loadSettings();
  const year = currentYear;
  const sim = simulateYear(year);
  const prev = sim.savingStart;
  const prevIsZero = prev === 0;

  let v = sInput.value.trim();
  let num = Number(v.replace(",", "."));

  // Controleer of de ingevoerde waarde verschilt van de expliciet opgeslagen waarde
  const explicitRaw = settings.yearStarting && settings.yearStarting[year];
  const explicitNum =
    typeof explicitRaw === "number"
      ? explicitRaw
      : Number(String(explicitRaw).replace(",", "."));
  
  let changed = false;
  if (isNaN(num) && explicitRaw) changed = true;
  else if (!isNaN(num) && num !== explicitNum) changed = true;


  if (!changed) {
      // Herstel naar de gesimuleerde/vorige waarde als er geen verandering is
      sInput.value = prevIsZero ? "" : formatNumberInput(prev);
      return;
  }
  
  const ok = confirm(
    "Weet je zeker dat je het beginsaldo spaarrekening wilt aanpassen?"
  );
  if (!ok) {
    sInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  // Waarde opslaan
  if (v === "" || isNaN(num)) {
      if (settings.yearStarting && settings.yearStarting[year]) {
          delete settings.yearStarting[year];
      }
  } else {
      if (!settings.yearStarting) settings.yearStarting = {};
      settings.yearStarting[year] = num;
  }
  
  // Maak settings.yearStarting schoon als het leeg is
  if (settings.yearStarting && Object.keys(settings.yearStarting).length === 0) {
      delete settings.yearStarting;
  }

  saveSettings(settings);
  resetCaches();
  if (typeof onDataChanged === "function") onDataChanged();
}

/**
 * Handler voor Blur/verlies van focus op het Bankrekening Beginsaldo veld.
 * Wordt gebruikt in de jaarinstellingen pop-up of wizard.
 * @param {number} currentYear - Het huidige jaar.
 * @param {function} onDataChanged - Callback om de UI te verversen.
 */
export function handleBankBlur(currentYear, onDataChanged) {
  const bInput = document.getElementById("startingBankInput");
  if (!bInput) return;

  const settings = loadSettings();
  const year = currentYear;
  const sim = simulateYear(year);
  const prev = sim.bankStart;
  const prevIsZero = prev === 0;

  let v = bInput.value.trim();
  let num = Number(v.replace(",", "."));
  
  // Controleer of de ingevoerde waarde verschilt van de expliciet opgeslagen waarde
  const explicitRaw = settings.yearBankStarting && settings.yearBankStarting[year];
  const explicitNum =
    typeof explicitRaw === "number"
      ? explicitRaw
      : Number(String(explicitRaw).replace(",", "."));

  let changed = false;
  if (isNaN(num) && explicitRaw) changed = true;
  else if (!isNaN(num) && num !== explicitNum) changed = true;

  if (!changed) {
    bInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  const negLimit =
    typeof settings.negativeLimit === "number" ? settings.negativeLimit : 0;

  if (!isNaN(num) && num < negLimit) {
    const limText =
      negLimit !== 0 ? formatNumberInput(negLimit) : "0,00";
    alert(
      `Dit beginsaldo is lager dan je ingestelde limiet voor negatief banksaldo (\u20ac ${limText}).`
    );
    bInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  let confirmMsg =
    "Weet je zeker dat je het beginsaldo bankrekening wilt aanpassen?";

  const ok = confirm(confirmMsg);
  if (!ok) {
    bInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  // --- Conflictoplossing met toekomstige jaren ---
  const existingLaterYear = findLaterStartYear(settings, year);
  if (!isNaN(num) && v !== "" && existingLaterYear && year < existingLaterYear) {
    const confirmStart = confirm(`Beginsaldo is al ingesteld voor ${existingLaterYear}.
Wil je ${year} als het nieuwe startjaar markeren en de latere instellingen resetten?`);
    if (!confirmStart) {
      bInput.value = prevIsZero ? "" : formatNumberInput(prev);
      return;
    }

    // Zet het huidige jaar als startmaand 1 (actief)
    if (!settings.startMonth) settings.startMonth = {};
    settings.startMonth[year] = 1;

    // Verwijder startsaldo's en startmaanden in latere jaren
    if (settings.startMonth) {
      for (const yStr of Object.keys(settings.startMonth)) {
        const yNum = parseInt(yStr, 10);
        if (!Number.isNaN(yNum) && yNum > year) {
          delete settings.startMonth[yNum];
        }
      }
    }

    if (settings.yearBankStarting) {
      for (const yStr of Object.keys(settings.yearBankStarting)) {
        const yNum = parseInt(yStr, 10);
        if (!Number.isNaN(yNum) && yNum > year) {
          delete settings.yearBankStarting[yNum];
        }
      }
    }
  }
  // --- Einde Conflictoplossing ---

  // Huidig jaar: nieuw beginsaldo opslaan of verwijderen
  if (v === "" || isNaN(num)) {
    if (settings.yearBankStarting && settings.yearBankStarting[year]) {
      delete settings.yearBankStarting[year];
    }
  } else {
    if (!settings.yearBankStarting) settings.yearBankStarting = {};
    settings.yearBankStarting[year] = num;
  }

  // Maak settings.yearBankStarting schoon als het leeg is
  if (settings.yearBankStarting && Object.keys(settings.yearBankStarting).length === 0) {
      delete settings.yearBankStarting;
  }

  saveSettings(settings);
  resetCaches();
  if (typeof onDataChanged === "function") onDataChanged();
}

/**
 * Slaat alle inputs uit de Jaarinstellingen Pop-up op (Maandelijks Sparen, Limieten).
 * @param {number} currentYear - Het huidige jaar.
 * @param {string} yearMonthlyType - Het type maandelijks sparen ("deposit" of "withdrawal").
 * @param {function} onDataChanged - Callback om de UI te verversen.
 */
export function saveYearInputs(currentYear, yearMonthlyType, onDataChanged) {
  const settings = loadSettings();
  const year = currentYear;

  // Maandelijks spaarinstelling
  const msInput = document.getElementById("monthlySavingAmount");
  if (msInput) {
    let v = msInput.value.trim();
    let num = Number(v.replace(",", "."));
    
    if (!settings.yearMonthlySaving) settings.yearMonthlySaving = {};

    if (v === "" || isNaN(num) || num <= 0) {
      if (settings.yearMonthlySaving[year]) {
        delete settings.yearMonthlySaving[year];
      }
    } else {
      settings.yearMonthlySaving[year] = {
        amount: num,
        type: yearMonthlyType || "deposit", 
      };
    }
    
    // Maak settings.yearMonthlySaving schoon als het leeg is
    if (settings.yearMonthlySaving && Object.keys(settings.yearMonthlySaving).length === 0) {
        delete settings.yearMonthlySaving;
    }
  }
  
  // Negatieve limiet
  const negInput = document.getElementById("negativeLimitInput");
  if (negInput) {
    let v2 = negInput.value.trim();
    let num2 = Number(v2.replace(",", "."));
    
    // Sla alleen op als er een geldige waarde is ingevoerd
    if (v2 !== "" && !isNaN(num2)) {
      settings.negativeLimit = num2;
    } else {
      // Indien leeg gelaten, zet de limiet op 0
      settings.negativeLimit = 0;
    }
  }
  
  saveSettings(settings);
  resetCaches();
  if (typeof onDataChanged === "function") onDataChanged();
}