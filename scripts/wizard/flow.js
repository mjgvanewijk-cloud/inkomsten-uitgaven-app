// scripts/wizard/flow.js

import { loadSettings, saveSettings } from "../core/storage.js";
import { currentYear, resetCaches } from "../core/state.js";
import { renderYear } from "../year/year-render.js";

import {
  closeAllWizardOverlays,
  openWelcomeOverlay,
  openWizardInfoPopup,
  showWizardCompletePopup,
} from "./ui.js";

import {
  runWizardStartBalanceStep,
  handleStartBalanceResult,
  runWizardNegativeLimitStep,
  handleNegativeLimitResult,
  openYearSettingsWizard,
  openRedLimitWizard,
} from "./steps.js";

// Re-export alle bestaande functies zodat imports gelijk blijven
export {
  openWelcomeOverlay,
  openWizardInfoPopup,
  runWizardStartBalanceStep,
  handleStartBalanceResult,
  runWizardNegativeLimitStep,
  handleNegativeLimitResult,
  showWizardCompletePopup,
  openYearSettingsWizard,
  openRedLimitWizard,
};

// ============================================================================\
// Welkomscherm-knop ("Aan de slag") – entrypoint
// ============================================================================\

export function setupWelcomeStartHandler() {
  const overlay = document.getElementById("welcomeOverlay");
  const btn = document.getElementById("welcomeStartBtn");

  if (!overlay || !btn) {
    return;
  }

  btn.addEventListener("click", () => {
    overlay.classList.add("hidden");

    const settings = loadSettings() || {};
    settings.welcomeShown = true;
    saveSettings(settings);

    const onInitComplete = () => {
      closeAllWizardOverlays();
      resetCaches();
      renderYear(); // De tabelpagina
    };

    // [FIX: SKIP LOGICA] De setup is compleet als BEIDE stappen expliciet zijn voltooid.
    // hasOwnProperty garandeert dat de sleutel daadwerkelijk is opgeslagen (en niet een default).
    
    // Check 1: Is de limiet-eigenschap opgeslagen?
    const hasNegativeLimitBeenSet = settings.hasOwnProperty('negativeLimit');
    
    // Check 2: Is het startsaldo voor het huidige jaar opgeslagen?
    const hasStartingBalanceBeenSet = 
      settings.yearBankStarting && settings.yearBankStarting.hasOwnProperty(currentYear);

    const isSetupComplete = hasNegativeLimitBeenSet && hasStartingBalanceBeenSet;


    if (isSetupComplete) {
      // Bestaande gebruiker: ga direct door naar de tabel.
      onInitComplete();
      return; 
    }
    
    // Nieuwe gebruiker/onvolledige setup: start de volledige wizard flow.
    openWizardInfoPopup(() => {
      openYearSettingsWizard(currentYear, onInitComplete);
    });
  });
}