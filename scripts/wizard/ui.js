// scripts/wizard/ui.js
// Wizard UI: overlays en generieke popups (geen opslaglogica).

/**
 * Sluit alle wizard-gerelateerde overlays.
 */
export function closeAllWizardOverlays() {
  const overlays = [
    document.getElementById("welcomeOverlay"),
    document.getElementById("wizardInfoOverlay"),
    document.getElementById("beginsaldoOverlay"),
    document.getElementById("limitOverlay"),
    document.getElementById("setupVoltooidOverlay"),
  ];
  overlays.forEach((overlay) => {
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("hidden");
      overlay.classList.remove("show");
    }
  });
}

// ============================================================================
// Welkomscherm & Info
// ============================================================================

/**
 * Welkomscherm – toont logo, tagline en 'Aan de slag'-knop.
 */
export function openWelcomeOverlay() {
  closeAllWizardOverlays();
  const overlay = document.getElementById("welcomeOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.style.display = "flex";
}

/**
 * Eenvoudige info-popup die uitlegt wat de wizard doet.
 * Roept onClose() aan wanneer de gebruiker bevestigt.
 */
export function openWizardInfoPopup(onClose) {
  closeAllWizardOverlays();
  let overlay = document.getElementById("wizardInfoOverlay");
  let sheet = document.getElementById("wizardInfoSheet");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "wizardInfoOverlay";
    overlay.className = "ff-popup-overlay";

    sheet = document.createElement("div");
    sheet.id = "wizardInfoSheet";
    sheet.className = "ff-popup";

    const title = document.createElement("h2");
    title.className = "ff-popup-title";
    title.textContent = "Uitleg beginwizard";

    const body = document.createElement("p");
    body.className = "ff-popup-text";
    body.innerHTML =
      "De wizard voor beginsaldo, inkomen en uitgaven wordt alleen gebruikt " +
      "om je toekomstige banksaldo te <strong>simuleren</strong>.<br><br>" +
      "Belangrijk:\u00a0de wizard vult <strong>geen maandcellen</strong> voor je in. " +
      "De jaar-tabel blijft leeg tot jij zelf per maand bedragen invult. " +
      "Je kunt de wizard dus veilig gebruiken als uitgangspunt, en later altijd per maand aanpassen.";

    const btnRow = document.createElement("div");
    btnRow.className = "popup-actions";

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.id = "wizardInfoOkBtn";
    okBtn.className = "save-settings-btn";
    okBtn.textContent = "Begrijp ik";

    btnRow.appendChild(okBtn);
    sheet.appendChild(title);
    sheet.appendChild(body);
    sheet.appendChild(btnRow);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  if (!overlay || !sheet) return;

  overlay.classList.remove("hidden");
  overlay.style.display = "flex";

  const okBtn = document.getElementById("wizardInfoOkBtn");
  if (okBtn) {
    okBtn.onclick = () => {
      closeAllWizardOverlays();
      if (typeof onClose === "function") onClose();
    };
  }
}

// ============================================================================
// Wizard voltooid
// ============================================================================

/**
 * Toont de "Setup voltooid" popup en roept onComplete() aan wanneer de gebruiker op OK klikt.
 */
export function showWizardCompletePopup(onComplete) {
  closeAllWizardOverlays();

  let overlay = document.getElementById("setupVoltooidOverlay");
  let sheet = document.getElementById("setupVoltooidSheet");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "setupVoltooidOverlay";
    overlay.className = "ff-popup-overlay ff-popup-overlay--wizard";

    sheet = document.createElement("div");
    sheet.id = "setupVoltooidSheet";
    sheet.className = "ff-popup ff-popup--wizard ff-popup--complete";

    sheet.innerHTML = `
        <div class="ff-popup__header">
          <h2 class="ff-popup__title">Setup voltooid</h2>
        </div>

        <div class="ff-popup__body">
          <p class="ff-popup__hint">
            Je FinFlow-instellingen zijn opgeslagen.  
            Je kunt nu verder met je jaaroverzicht.
          </p>
        </div>

        <div class="ff-popup__footer">
          <button type="button" id="setupVoltooidOkBtn" class="ff-btn ff-btn--primary" data-action="ok">OK</button>
        </div>
      `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  if (!overlay || !sheet) return;

  overlay.style.display = "flex";
  sheet.classList.add("show");

  const okBtn = document.getElementById("setupVoltooidOkBtn");
  if (okBtn) {
    okBtn.onclick = () => {
      closeAllWizardOverlays();
      if (typeof onComplete === "function") {
        onComplete();
      }
    };
  }
}
