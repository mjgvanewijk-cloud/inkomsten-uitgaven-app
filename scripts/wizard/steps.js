// scripts/wizard/steps.js
// Wizard-logica: beginsaldo, roodstaanlimiet, opslag en jaarflows.

import { loadSettings, saveSettings } from "../core/storage.js";
import {
  currentYear,
  simulateYear,
  getNegativeLimit,
  resetCaches,
} from "../core/state.js";
import { formatAmount0 } from "../year/year-utils.js";
import { showWizardCompletePopup } from "./ui.js";

// === Globale Status ===
let wizardFlowCurrentYear = null;

// === Maandnamen voor foutmelding ===
const monthNames = [
    "januari", "februari", "maart", "april", "mei", "juni", 
    "juli", "augustus", "september", "oktober", "november", "december"
];


/**
 * Berekent de meest negatieve banksaldo die in de huidige en toekomstige jaren
 * (tot 5 jaar) wordt bereikt, op basis van de huidige planning.
 * * @returns {{value: number, year: number | null, month: number | null}} Een object 
 * met de meest negatieve banksaldo waarde en de locatie.
 */
function findMaxNegativeBalance() {
  const startYear =
    typeof wizardFlowCurrentYear === "number" ? wizardFlowCurrentYear : currentYear;

  let result = {
    value: 0, // Meest negatieve saldo (start op 0)
    year: null,
    month: null,
  };

  const yearsToCheck = 5; // Controleer 5 jaar vooruit

  for (let year = startYear; year < startYear + yearsToCheck; year++) {
    // simulateYear haalt automatisch de bankStart van het voorgaande jaar op
    const simulationResult = simulateYear(year); 

    if (!simulationResult || !Array.isArray(simulationResult.months)) {
      continue; 
    }

    // Loop door alle maanden (index 0 t/m 11)
    simulationResult.months.forEach((monthData, index) => {
      // Index is 0-gebaseerd, maandnummer is index + 1
      const monthNumber = index + 1; 
      
      // bankEnd is de banksaldo aan het einde van de maand
      const bal = Number(monthData.bankEnd ?? 0); 
      
      if (bal < result.value) {
        result.value = bal;
        result.year = year;
        result.month = monthNumber;
      }
    });
  }

  return result;
}


// ============================================================================\
// Beginsaldo Popup (UI definitie uit bestaande flow)
// ============================================================================\

function openWizardBeginsaldoPopup({ year, onConfirm, onSkip }) {
  const overlay = document.createElement("div");
  overlay.id = "beginsaldoOverlay";
  overlay.className = "ff-popup-overlay ff-popup-overlay--wizard";

  const popup = document.createElement("div");
  popup.className = "ff-popup ff-popup--wizard ff-popup--beginsaldo";

  popup.innerHTML = `
    <div class="ff-popup__header">
      <h2 class="ff-popup__title">Beginsaldo instellen ${year}</h2>
    </div>

    <div class="ff-popup__body">
      <label class="ff-field ff-field--full">
        <span class="ff-field__label">Beginsaldo bankrekening</span>
        <div class="ff-input-sign-row">
          <button
            type="button"
            class="ff-sign-toggle ff-sign-toggle--positive"
            data-sign="plus"
          >
            +
          </button>
          <input
            type="text"
            inputmode="decimal"
            step="0.01"
            value=""
            class="ff-input ff-input--number ff-input--beginsaldo"
          />
        </div>
      </label>

      <p class="ff-popup__hint">
        Voer je beginsaldo in. Laat leeg of klik Overslaan als dit 0 is.
      </p>
    </div>

    <div class="ff-popup__footer">
      <button type="button" class="ff-btn ff-btn--secondary" data-action="skip">Overslaan</button>
      <button type="button" class="ff-btn ff-btn--primary" data-action="next">Volgende</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  overlay.style.display = "flex";


  const input = popup.querySelector("input.ff-input--beginsaldo");
  const signToggle = popup.querySelector(".ff-sign-toggle");
  const btnNext = popup.querySelector("[data-action='next']");
  const btnSkip = popup.querySelector("[data-action='skip']");

  let sign = 1; 

  const errorMsg = document.createElement("div");
  errorMsg.className = "ff-error-msg";
  errorMsg.style.display = "none";
  errorMsg.innerHTML = `
    <span class="ff-error-msg__icon"></span>
    <span class="ff-error-msg__text">Voer een geldig bedrag in.</span>
  `;
  input.parentElement.appendChild(errorMsg);

  function updateSignVisual() {
    if (!signToggle) return;
    if (sign < 0) {
      signToggle.classList.add("ff-sign-toggle--negative");
      signToggle.classList.remove("ff-sign-toggle--positive");
      signToggle.textContent = "–";
    } else {
      signToggle.classList.add("ff-sign-toggle--positive");
      signToggle.classList.remove("ff-sign-toggle--negative");
      signToggle.textContent = "+";
    }
  }

  if (signToggle) {
    updateSignVisual();
    signToggle.addEventListener("click", () => {
      sign = sign * -1;
      updateSignVisual();
      validate();
    });
  }

  function cleanup() {
    overlay.remove();
  }

  function validate() {
    const raw = input.value.trim();

    if (raw === "") {
      input.classList.remove("ff-input--error");
      errorMsg.style.display = "none";
      return 0;
    }

    const magnitude = Number(raw.replace(",", "."));

    if (Number.isNaN(magnitude) || magnitude < 0) {
      input.classList.add("ff-input--error");
      errorMsg.style.display = "flex";
      errorMsg.querySelector(".ff-error-msg__text").textContent =
        "Voer een geldig bedrag in met alleen cijfers en eventueel een komma.";
      return null;
    }

    const n = sign < 0 ? -magnitude : magnitude;

    input.classList.remove("ff-input--error");
    errorMsg.style.display = "none";
    return n;
  }

  input.addEventListener("input", validate);

  btnNext.addEventListener("click", () => {
    const val = validate();
    if (val === null) return;

    if (val < 0) {
      const ok = window.confirm(
        "Je hebt een negatief beginsaldo ingevoerd. Is dit correct?"
      );
      if (!ok) {
        return;
      }
    }

    cleanup();
    if (typeof onConfirm === "function") onConfirm(val);
  });

  btnSkip.addEventListener("click", () => {
    cleanup();
    if (typeof onSkip === "function") onSkip(0);
  });

  overlay.addEventListener("click", (evt) => {
    if (evt.target === overlay) {
      cleanup();
      if (typeof onSkip === "function") onSkip(0);
    }
  });
}

export function runWizardStartBalanceStep(year, onComplete) {
    openWizardBeginsaldoPopup({
        year,
        onConfirm(bankStartValue) {
            handleStartBalanceResult(bankStartValue, onComplete);
        },
        onSkip(defaultValue) {
            handleStartBalanceResult(defaultValue, onComplete);
        }
    });
}

export function handleStartBalanceResult(bankStartValue, onComplete) {
    const year = wizardFlowCurrentYear;
    const s = loadSettings() || {};
    s.yearBankStarting = s.yearBankStarting || {};
    s.yearBankStarting[year] = Number(bankStartValue) || 0;
    
    s.startMonth = s.startMonth || {};
    s.startMonth[year] = 1;
    saveSettings(s);

    // [FIX: Cache Reset] Reset de caches direct nadat het beginsaldo is opgeslagen. 
    resetCaches();
    
    if (typeof onComplete === "function") onComplete(s.yearBankStarting[year]);
}


// ============================================================================\
// Roodstaan Limiet Popup (UI definitie uit bestaande flow)
// ============================================================================\

function openWizardNegativeLimitPopup({ title, onConfirm, onSkip, minAmount = 0 }) {
  const overlay = document.createElement("div");
  overlay.id = "limitOverlay"; 
  overlay.className = "ff-popup-overlay ff-popup-overlay--wizard";

  const popup = document.createElement("div");
  popup.className = "ff-popup ff-popup--wizard ff-popup--negativelimit";

  popup.innerHTML = `
    <div class="ff-popup__header">
      <h2 class="ff-popup__title">${title}</h2>
    </div>

    <div class="ff-popup__body">
      <label class="ff-field ff-field--full">
        <span class="ff-field__label">Roodstaanlimiet (optioneel)</span>
        <input
          type="text"
          inputmode="decimal"
          step="0.01"
          min="0"
          value="Geen"
          class="ff-input ff-input--number ff-input--negativelimit"
        />
      </label>

      <p id="limitValidationMessage" class="ff-popup__hint" style="color: #ffca80; margin-top: 10px; display: none;"></p>
      
      <p class="ff-popup__hint">
        Indien van toepassing: voer limietbedrag in en klik op Volgende.
      </p>
    </div>

    <div class="ff-popup__footer">
      <button type="button" class="ff-btn ff-btn--secondary" data-action="skip">Overslaan</button>
      <button type="button" class="ff-btn ff-btn--primary" data-action="next">Volgende</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  overlay.style.display = "flex";

  const input = popup.querySelector("input");
  input.blur(); 

  const btnNext = popup.querySelector('[data-action="next"]');
  const btnSkip = popup.querySelector('[data-action="skip"]');
  const messageEl = document.getElementById("limitValidationMessage");

  const errorMsg = document.createElement("div");
  errorMsg.className = "ff-error-msg";
  errorMsg.style.display = "none";
  errorMsg.innerHTML = `
    <span class="ff-error-msg__icon"></span>
    <span class="ff-error-msg__text"></span>
  `;
  input.parentElement.appendChild(errorMsg);

  function cleanup() {
    overlay.remove();
  }

  function clearError() {
    input.classList.remove("ff-input--error");
    errorMsg.style.display = "none";
  }
  
  function updateMessage(requiredMin) {
    // Haal de simulatiegegevens op om te bepalen wat de diepste roodstand is
    const maxNegativeBalanceResult = findMaxNegativeBalance();
    const maxNegativeBalance = maxNegativeBalanceResult.value;
    
    const absoluteMaxNegative = Math.abs(maxNegativeBalance);
    
    // Alleen een bericht tonen als er een probleem is dat door de limiet moet worden opgelost
    if (maxNegativeBalance < 0 && absoluteMaxNegative > minAmount) {
      
      const requiredLimitFormatted = formatAmount0(absoluteMaxNegative); 
      const negativeBalanceFormatted = formatAmount0(maxNegativeBalance);
      
      let locationText = "";
      if (maxNegativeBalanceResult.year && maxNegativeBalanceResult.month) {
          // Maandindex is 0-gebaseerd
          locationText = ` (in ${monthNames[maxNegativeBalanceResult.month - 1]} ${maxNegativeBalanceResult.year})`;
      }

      messageEl.innerHTML = `
        **Waarschuwing:** Uw planning leidt tot een banksaldo van **${negativeBalanceFormatted}** ${locationText}.
        U moet een limiet van minimaal **${requiredLimitFormatted}** instellen.
      `;
      messageEl.style.display = "block";

    } else {
      messageEl.style.display = "none";
      messageEl.innerHTML = "";
    }
  }


  // VALIDATIE FUNCTIE
  function validate() {
    clearError();
    
    const raw = input.value.trim();

    // Bepaal de meest restrictieve minimum
    const maxNegativeBalanceResult = findMaxNegativeBalance();
    const maxNegativeBalance = maxNegativeBalanceResult.value;
    const absoluteMaxNegative = Math.abs(maxNegativeBalance); 
    const requiredMin = Math.max(minAmount, absoluteMaxNegative); 

    // Update het informatiebericht bij elke validatie/input
    updateMessage(requiredMin);
    
    // 1. Check op leeg/overslaan (raw is "" of "geen")
    if (raw === "" || raw.toLowerCase() === "geen") {
      if (requiredMin > 0) {
        // GEEN/OVERSLAAN IS NIET TOEGESTAAN: Toon foutmelding
        input.classList.add("ff-input--error");
        errorMsg.style.display = "block"; 
        errorMsg.querySelector(".ff-error-msg__text").textContent =
            `Let op: De huidige planning vereist een limiet van minimaal €${formatAmount0(requiredMin)}.`;
        return null; 
      }
      clearError();
      return 0; // Overslaan is toegestaan
    }

    const n = Number(raw.replace(",", "."));

    // 2. Check op geldig positief getal
    if (Number.isNaN(n) || n < 0) {
      input.classList.add("ff-input--error");
      errorMsg.style.display = "block"; 
      errorMsg.querySelector(".ff-error-msg__text").textContent =
        "Voer een geldig positief bedrag in of laat leeg voor 'Geen'.";
      return null;
    }
    
    // 3. KRITIEKE VALIDATIE: Check tegen de meest restrictieve minimum
    if (requiredMin > 0 && n < requiredMin) {
        input.classList.add("ff-input--error");
        errorMsg.style.display = "block"; 
        errorMsg.querySelector(".ff-error-msg__text").textContent =
            `De ingevoerde limiet (€${formatAmount0(n)}) is te laag. Er is minimaal €${formatAmount0(requiredMin)} vereist.`;
        return null;
    }

    clearError();
    return n; // Validatie geslaagd
  }

  // Eerste update van het bericht bij openen
  validate(); 


  input.addEventListener("input", validate);
  input.addEventListener("focus", () => {
    if (input.value === "Geen") {
      input.value = "";
    }
  });

  input.addEventListener("blur", () => {
    if (input.value.trim() === "") {
        input.value = "Geen";
    }
  });

  btnNext.addEventListener("click", () => {
    const val = validate();
    if (val === null) return;
    cleanup();
    if (typeof onConfirm === "function") onConfirm(val);
  });

  btnSkip.addEventListener("click", () => {
    const raw = input.value.trim();
    
    // Als de gebruiker een geldige waarde heeft ingevoerd, bevestig deze
    if (raw !== "" && raw.toLowerCase() !== "geen") {
        const val = validate();
        if (val === null) return;
        
        cleanup();
        if (typeof onConfirm === "function") onConfirm(val);
        return;
    }
    
    // Als de invoer leeg/Geen is:
    const val = validate();
    
    if (val === null) {
        // Een fout is opgetreden (bijv. limiet is vereist)
        return;
    }
    
    cleanup();
    // [FIX: Limiet Behoud] Stuur undefined door om de bestaande limiet te BEHOUDEN bij overslaan
    if (typeof onSkip === "function") onSkip(undefined); 
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      const maxNegativeBalanceResult = findMaxNegativeBalance();
      const requiredMin = Math.max(minAmount, Math.abs(maxNegativeBalanceResult.value));
      
      if (requiredMin > 0) {
        // Blokkeer sluiten als een limiet vereist is
        input.classList.add("ff-input--error");
        errorMsg.style.display = "block"; 
        errorMsg.querySelector(".ff-error-msg__text").textContent =
            `Let op: U moet een limiet instellen van minimaal €${formatAmount0(requiredMin)} om de huidige planning te dekken.`;
        return;
      }
      
      cleanup();
      // [FIX: Limiet Behoud] Stuur undefined door om de bestaande limiet te BEHOUDEN bij sluiten
      if (typeof onSkip === "function") onSkip(undefined);
    }
  });
}

export function runWizardNegativeLimitStep(minAmount, onNext) {
  openWizardNegativeLimitPopup({
    title: "Roodstaanlimiet instellen",
    minAmount,
    onConfirm(amount) {
      if (typeof onNext === "function") onNext(amount);
    },
    onSkip(amount) {
      // Amount is nu 0 (als leeg toegestaan) of undefined (als skip/behoud)
      if (typeof onNext === "function") onNext(amount);
    },
  });
}

export function handleNegativeLimitResult(amount, onNext) {
  const settings = loadSettings() || {};

  // [FIX: Limiet Behoud] Als amount undefined is (overslaan zonder nieuwe waarde), behoud de bestaande limiet.
  if (amount === undefined) {
      if (typeof onNext === "function") onNext();
      return;
  }
  
  if (amount === "" || amount === null || amount === 0) {
    settings.negativeLimit = 0;
    saveSettings(settings);
    if (typeof onNext === "function") onNext();
    return;
  }

  const n = Number(amount);
  if (Number.isNaN(n) || n < 0) {
    settings.negativeLimit = 0;
  } else {
    settings.negativeLimit = n;
  }

  saveSettings(settings);
  resetCaches();
  simulateYear(wizardFlowCurrentYear);

  if (typeof onNext === "function") onNext();
}


// ============================================================================\
// Hoofdflows: openYearSettingsWizard & openRedLimitWizard
// ============================================================================\

export function openYearSettingsWizard(year, onComplete) {
  wizardFlowCurrentYear = year;

  runWizardStartBalanceStep(year, (startingBalance) => {
    const minAmount = startingBalance < 0 ? Math.abs(startingBalance) : 0;

    runWizardNegativeLimitStep(minAmount, (negLimitAmount) => {
      handleNegativeLimitResult(negLimitAmount, () => {
        showWizardCompletePopup(onComplete);
      });
    });
  });
}

export function openRedLimitWizard(year, onComplete) {
  wizardFlowCurrentYear = year;

  const settings = loadSettings() || {};
  const startingBalance = Number(settings.yearBankStarting?.[year] || 0);
  const minAmount = startingBalance < 0 ? Math.abs(startingBalance) : 0;

  runWizardNegativeLimitStep(minAmount, (negLimitAmount) => {
    handleNegativeLimitResult(negLimitAmount, () => {
      showWizardCompletePopup(onComplete);
    });
  });
}