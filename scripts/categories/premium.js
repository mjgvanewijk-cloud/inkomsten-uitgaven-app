// scripts/premium.js
// Premium- en proefperiode-logica voor FinFlow.
// Gebruikt settings uit storage.js, maar heeft geen afhankelijkheden van UI of state.

import { loadSettings, saveSettings } from "../core/storage.js";

function ensurePremiumStruct(settings) {
  if (!settings || typeof settings !== "object") {
    settings = {};
  }
  if (!settings.premium || typeof settings.premium !== "object") {
    settings.premium = {
      active: false,
      trialStart: null,
      trialUsed: false,
    };
  } else {
    if (typeof settings.premium.active !== "boolean") {
      settings.premium.active = !!settings.premium.active;
    }
    if (
      settings.premium.trialStart !== null &&
      typeof settings.premium.trialStart !== "string"
    ) {
      settings.premium.trialStart = null;
    }
    if (typeof settings.premium.trialUsed !== "boolean") {
      settings.premium.trialUsed = !!settings.premium.trialUsed;
    }
  }
  return settings;
}

export function getPremium() {
  const settings = ensurePremiumStruct(loadSettings() || {});
  return settings.premium;
}

export function setPremiumActive(active) {
  const settings = ensurePremiumStruct(loadSettings() || {});
  settings.premium.active = !!active;
  saveSettings(settings);
}

export function startPremiumTrial() {
  const today = new Date().toISOString().slice(0, 10);
  const settings = ensurePremiumStruct(loadSettings() || {});
  const p = settings.premium;

  p.active = true;
  p.trialStart = today;
  p.trialUsed = true;

  saveSettings(settings);
}

export function isTrialActive() {
  const p = getPremium();
  if (!p.active || !p.trialStart) return false;

  const start = new Date(p.trialStart);
  const now = new Date();

  const diffMs = now.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= 7;
}

export function isPremiumActiveForUI() {
  const p = getPremium();

  if (!p.active) return false;

  if (!p.trialStart) {
    return true;
  }

  return isTrialActive();
}

// === NIEUWE FUNCTIE: PREMIUM POP-UP (Fix voor ReferenceError) ===
/**
 * Toont de pop-up om de gebruiker de Premium proefperiode te laten starten.
 * Deze functie was nodig omdat deze elders werd aangeroepen, maar niet gedefinieerd was.
 */
function openPremiumTrialPopup() {
    const overlayId = "premiumTrialOverlay";
    let overlay = document.getElementById(overlayId);
    
    // Zorgt ervoor dat de pop-up zichtbaar is als deze al bestaat
    if (overlay) {
        overlay.style.display = 'flex';
        return;
    }

    // Creëer de overlay
    overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "ff-popup-overlay"; // Gebruik de verwachte CSS klasse
    overlay.style.display = 'flex'; 

    const sheet = document.createElement("div");
    sheet.className = "ff-popup"; // Gebruik de verwachte CSS klasse

    sheet.innerHTML = `
        <h2>Probeer FinFlow Premium</h2>
        <p>Ontgrendel onbeperkt categoriebeheer en andere functies met een gratis proefperiode van 7 dagen.</p>
        <div class="settings-actions">
            <button id="startTrialBtn" class="ff-btn ff-btn--primary">Gratis Proefperiode Starten</button>
            <button id="closeTrialBtn" class="ff-btn ff-btn--secondary">Later</button>
        </div>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const closePopup = () => overlay.remove();

    // Koppel event handlers
    document.getElementById("startTrialBtn").onclick = () => {
        startPremiumTrial(); 
        closePopup();
        // Herlaad de UI zodat de Premium status direct zichtbaar wordt (zoals in year.js)
        if (typeof window.renderYear === 'function') window.renderYear();
    };

    document.getElementById("closeTrialBtn").onclick = closePopup;

    // Sluit de popup als er op de overlay wordt geklikt (eenvoudige implementatie)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });
}


// BELANGRIJK: Maak de pop-up functie globaal beschikbaar.
// Dit lost de "openPremiumTrialPopup is not defined" fout op.
window.openPremiumTrialPopup = openPremiumTrialPopup;