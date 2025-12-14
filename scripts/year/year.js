// scripts/year/year.js
// De centrale coördinator voor de jaar-module.

import { loadSettings, saveSettings } from "../core/storage.js";
import { 
    currentYear, 
    setCurrentYear, 
    resetCaches 
} from "../core/state.js";

import { renderYear } from "./year-render.js";
import { openYearCategoriesSheet } from "../categories/categories-sheet.js";
import { 
    openYearSettingsWizard,
    openRedLimitWizard, // NIEUW: Importeer de Rood Staan Limiet Wizard
    openWelcomeOverlay,       
    setupWelcomeStartHandler  
}
from "../wizard/flow.js"; 

import { 
    createPopupOverlay, 
    createPopupContainer, 
    attachEscapeToClose, 
    attachPopupCloseOnOverlayClick 
}
from "../ui/popups.js";


let onDataChangedCallback = null;

// === NAVIGATIE EN INIT FUNCTIES ===

function setupYearNavigation() {
    const prevBtn = document.getElementById("yearZonePrev");
    const nextBtn = document.getElementById("yearZoneNext");

    if (prevBtn) {
        prevBtn.onclick = () => {
            setCurrentYear(currentYear - 1);
            if (onDataChangedCallback) onDataChangedCallback();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            setCurrentYear(currentYear + 1);
            if (onDataChangedCallback) onDataChangedCallback();
        };
    }
}

function setupHeaderButtons() {
    const settingsBtn = document.getElementById("yearSettingsBtn");
    const catsBtn = document.getElementById("openCatsSheetBtn");

    // FIX: JAARINSTELLINGEN KLIKZONE UITBREIDEN
    const yearTitleElement = document.getElementById("yearTitle");
    const headerClickZone = yearTitleElement ? yearTitleElement.parentNode : settingsBtn;
    
    if (headerClickZone) {
        headerClickZone.onclick = (e) => {
            // Voorkom dat clicks op de categorieën-knop deze popup triggeren
            if (e.target.id === 'openCatsSheetBtn' || e.currentTarget.id === 'openCatsSheetBtn') {
                 return;
            }

            console.log("DEBUG: Jaarheader/Tandwiel zone geklikt. Open settings sheet.");
            openYearSettingsSheet(currentYear, () => {
                resetCaches();
                renderYear();
            });
        };
    }
    
    // Categorieën Knop (blijft ongewijzigd)
    if (catsBtn) {
        catsBtn.onclick = () => openYearCategoriesSheet(() => {
            resetCaches();
            renderYear();
        });
    }
}


/**
 * Initialiseert de jaarweergave: navigatie, knoppen en wizard-check.
 * @param {function} onChange - Callback om de UI te verversen.
 */
export function initYearModule(onChange) {
    onDataChangedCallback = onChange;

    // Koppel de navigatie en knoppen direct
    setupYearNavigation();
    setupHeaderButtons();

    // De callback die de app rendert na de wizard of na een wijziging
    const onSetupComplete = () => {
        resetCaches(); 
        renderYear();
    };

    const settings = loadSettings(); 

    // 1. Controleer of het Welkomscherm al is getoond
    if (!settings.welcomeShown) {
        openWelcomeOverlay(onSetupComplete);
        setupWelcomeStartHandler(); 
        return;                     
    }
    
    // 2. Controleer of de Wizard nodig is (Beginsaldi voor DIT jaar ontbreken)
    const yearBankSettings = settings.yearBankStarting || {};
    
    const needsWizard = 
        yearBankSettings[currentYear] === undefined || 
        yearBankSettings[currentYear] === null;

    if (needsWizard) {
        // Start de volledige setup wizard
        openYearSettingsWizard(currentYear, onSetupComplete);
        return; 
    }

    // 3. Alles is ingesteld, start direct met renderen
    renderYear();
}

// === JAARINSTELLINGEN SHEET (De pop-up van de knop) ===

/**
 * Opent de jaarinstellingen-sheet (de popup met 'Beginsaldo wijzigen', etc.)
 * @param {number} year 
 * @param {function} onClose - Callback om UI te verversen na sluiten.
 */
export function openYearSettingsSheet(year, onClose = () => {}) {
    
    // ... (Overlay en Content creatie blijft hetzelfde) ...
    const overlay = createPopupOverlay();
    const content = createPopupContainer('ff-settings-popup--vertical'); 
    
    if (!overlay || !content) {
        console.error("Fout: Kon overlay of content-container niet aanmaken via popups.js");
        return; 
    }
    
    overlay.appendChild(content); 

    const title = `Instellingen voor ${year}`; 
    overlay.id = `yearSettingsOverlay-${year}`; 

    content.innerHTML = `
        <div class="ff-popup__header">
          <h2 class="ff-popup__title">${title}</h2>
        </div>

        <div class="ff-popup__body ff-popup__body--spaced">
            <p class="ff-popup__text ff-popup__text--spaced">Kies een actie voor dit jaar.</p>
            
            <div class="settings-action-group settings-action-group--spaced">
                <button id="openSetupBeginsaldoPopupBtn" class="ff-btn ff-btn--primary">
                    Beginsaldo wijzigen
                </button>
                <button id="openRedLimitPopupBtn" class="ff-btn ff-btn--primary">
                    Rood staan limiet
                </button>
                <button id="openPremiumBtnSettings" class="ff-btn ff-btn--primary">
                    Categorieën beheren (Premium)
                </button>
            </div>
            
        </div>
        <div class="ff-popup__footer">
            <button class="ff-btn ff-btn--secondary" id="closeYearSettingsBtn">Sluiten</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // ... (Koppelingen voor knoppen blijven hetzelfde) ...
    
    // Koppel Sluiten-knop en overlay sluiten
    const closeBtn = overlay.querySelector("#closeYearSettingsBtn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            overlay.remove(); 
            onClose();
        };
    }
    attachPopupCloseOnOverlayClick(overlay, () => { overlay.remove(); onClose(); }); 
    attachEscapeToClose(overlay, () => { overlay.remove(); onClose(); }); 

    // Koppel Beginsaldo wijzigen
    const beginsaldoBtn = overlay.querySelector("#openSetupBeginsaldoPopupBtn");
    if (beginsaldoBtn) {
        beginsaldoBtn.onclick = () => {
            overlay.remove();
            openYearSettingsWizard(currentYear, onClose); 
        };
    }
    
    // Koppel Rood staan limiet
    const redLimitBtn = overlay.querySelector("#openRedLimitPopupBtn");
    if (redLimitBtn) {
        redLimitBtn.onclick = () => {
            overlay.remove();
            if (openRedLimitWizard) {
                openRedLimitWizard(currentYear, onClose);
            } else {
                console.error("openRedLimitWizard is niet geïmporteerd of gedefinieerd in flow.js.");
            }
        };
    }

    // Koppel Premium-knop (nu Categorieën beheren)
    const premiumBtn = overlay.querySelector("#openPremiumBtnSettings");
    if (premiumBtn) {
        premiumBtn.onclick = () => {
            overlay.remove();
            if (window.openPremiumTrialPopup) {
                // We nemen aan dat deze de Premium trial/upgrade opent
                window.openPremiumTrialPopup();
            } else {
                console.error("openPremiumTrialPopup is niet beschikbaar (premium.js niet geladen).");
            }
        };
    }
}

// === WINDOW/GLOBAL SCOPE KOPPELINGEN (Voor onblur in de HTML) ===
// Deze functies komen uit year-module-handlers.js en worden globaal gemaakt.

document.addEventListener("DOMContentLoaded", async () => {
    // Dynamische import van handlers na de DOMContentLoaded event
    const handlers = await import('./year-module-handlers.js');

    // Maak de handlers globaal beschikbaar
    window.handleBankBlur = () => handlers.handleBankBlur(currentYear, onDataChangedCallback);
    window.handleSavingsBlur = () => handlers.handleSavingsBlur(currentYear, onDataChangedCallback);
    window.saveYearInputs = (year, type, callback) => handlers.saveYearInputs(year, type, callback);
    
    // Zorg ervoor dat de callback ook globaal is als nodig
    window.onDataChanged = onDataChangedCallback;
});


// === EXPORTS (voor gebruik in andere modules) ===
export {
    currentYear,
    setCurrentYear,
    // openYearSettingsSheet wordt ook geëxporteerd
};