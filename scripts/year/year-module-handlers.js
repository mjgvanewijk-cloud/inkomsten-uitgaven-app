// scripts/year/year-module-handlers.js
// Logica voor het verwerken van beginsaldi en maandelijks spaarinput.

import { loadSettings, saveSettings } from "../core/storage.js";
import { formatAmount0 } from "./year-utils.js"; 

/**
 * Helper functie om een inputveld waarde op te slaan in de settings.
 */
function saveInputData(year, settingsKey, inputId, onDataChanged) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const n = Number(input.value.replace(',', '.')) || 0; 
    
    // 1. Data opslaan
    const settings = loadSettings();
    settings[settingsKey] = settings[settingsKey] || {};
    settings[settingsKey][year] = n;
    saveSettings(settings);

    // 2. UI Waarde Formatteren
    input.value = formatAmount0(n);
    
    // 3. App verversen
    if (onDataChanged) onDataChanged();
}

/**
 * Slaat het beginsaldo van de bank op (triggerd door onblur).
 */
export function handleBankBlur(year, onDataChanged) {
    saveInputData(year, 'yearBankStarting', 'yearBankStartInput', onDataChanged);
}

/**
 * Slaat het beginsaldo van het spaarpotje op (triggerd door onblur).
 */
export function handleSavingsBlur(year, onDataChanged) {
    saveInputData(year, 'yearStarting', 'yearSavingsStartInput', onDataChanged);
}


/**
 * Slaat de jaarlijkse inputs op (maandelijks sparen/limiet).
 * Deze wordt gebruikt door de Wizard en door de knop handlers.
 * @param {number} year - Het huidige jaar.
 * @param {string} monthlyType - 'deposit' of 'withdraw'.
 * @param {function} onDataChanged - De callback.
 */
export function saveYearInputs(year, monthlyType, onDataChanged) {
    const settings = loadSettings();

    // Maandelijks spaarinstelling
    const msInput = document.getElementById("monthlySavingAmount");
    if (msInput) {
        let v = msInput.value.trim();
        let num = Number(v.replace(",", "."));
        
        if (!settings.yearMonthlySaving) settings.yearMonthlySaving = {};

        if (v === "" || isNaN(num) || num < 0) { // Negatieve inputs zijn niet toegestaan
            if (settings.yearMonthlySaving[year]) {
                delete settings.yearMonthlySaving[year];
            }
        } else {
            settings.yearMonthlySaving[year] = {
                amount: num,
                type: monthlyType || "deposit", 
            };
        }
    }
    
    // Negatieve limiet (uit de year-storage logic, nu hier geconsolideerd)
    const negInput = document.getElementById("negativeLimitInput");
    if (negInput) {
        let v2 = negInput.value.trim();
        let num2 = Number(v2.replace(",", "."));
        
        if (v2 !== "" && !isNaN(num2)) {
            settings.negativeLimit = num2;
        } else {
            delete settings.negativeLimit;
        }
        
        // Formatteer de input direct terug (optioneel, maar goed voor de UX)
        if (negInput.value !== "") {
             negInput.value = formatAmount0(num2);
        }
    }

    saveSettings(settings);

    // App verversen
    if (onDataChanged) onDataChanged();
}