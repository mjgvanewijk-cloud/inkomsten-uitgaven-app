// scripts/ui/popups.js
// Centrale popup-engine voor FinFlow.
// Hier definiëren we een toekomstvaste basis voor alle popups:
//  - overlay (ff-popup-overlay)
//  - container (ff-popup)
//  - focus-trap
//  - sluiten via overlay-click en Escape
//  - gestandaardiseerde foutmeldingen met icoon (ff-error-msg)

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Maakt een overlay-element met standaard FinFlow-styling.
 * Extra CSS-klassen kunnen worden meegegeven voor specifieke varianten
 * (bijvoorbeeld 'ff-popup-overlay--wizard').
 */
export function createPopupOverlay(extraClass = "") {
  const overlay = document.createElement("div");
  overlay.className = ["ff-popup-overlay", extraClass].filter(Boolean).join(" ");
  return overlay;
}

/**
 * Maakt een popup-container met basis-klasse ff-popup en optionele extra varianten.
 */
export function createPopupContainer(extraClass = "") {
  const popup = document.createElement("div");
  popup.className = ["ff-popup", extraClass].filter(Boolean).join(" ");
  return popup;
}

/**
 * Sluit popup wanneer er buiten het popup-element op de overlay wordt geklikt.
 * Optioneel kan een onClose-callback worden meegegeven.
 */
export function attachPopupCloseOnOverlayClick(overlay, onClose) {
  if (!overlay) return;
  overlay.addEventListener("click", (ev) => {
    if (ev.target !== overlay) return;

    if (typeof onClose === "function") {
      onClose();
    } else {
      overlay.remove();
    }
  });
}

/**
 * Sluit popup met Escape. Verwijdert zichzelf weer zodra gesloten.
 */
export function attachEscapeToClose(overlay, onClose) {
  if (!overlay) return;

  function handler(e) {
    if (e.key !== "Escape") return;

    if (typeof onClose === "function") {
      onClose();
    } else {
      overlay.remove();
    }
    document.removeEventListener("keydown", handler, true);
  }

  document.addEventListener("keydown", handler, true);
}

/**
 * Houdt de focus binnen het popup-element wanneer de gebruiker met Tab navigeert.
 */
export function trapFocusInPopup(popup) {
  if (!popup) return;

  popup.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        popup.querySelectorAll(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    { capture: true }
  );
}

/**
 * Maakt een standaard foutmeldingselement voor onder een inputveld.
 * Dit gebruikt de globale .ff-error-msg-styling (rood icoon + tekst).
 */
export function createFieldError(message = "") {
  const errorMsg = document.createElement("div");
  errorMsg.className = "ff-error-msg";
  errorMsg.style.display = "none";
  errorMsg.innerHTML =
    "<span class='ff-error-msg__icon'></span>" +
    "<span class='ff-error-msg__text'></span>";

  if (message) {
    const span = errorMsg.querySelector(".ff-error-msg__text");
    if (span) span.textContent = message;
  }
  return errorMsg;
}

/**
 * Toont of verbergt een foutmelding bij een input op consistente wijze.
 * - message = null/"" => foutmelding weg, input normaliseren
 * - message = string   => foutmelding tonen met opgegeven tekst
 */
export function setFieldError(input, errorEl, message) {
  if (!input || !errorEl) return;

  const span = errorEl.querySelector(".ff-error-msg__text");

  if (!message) {
    input.classList.remove("ff-input--error");
    errorEl.style.display = "none";
    if (span) span.textContent = "";
    return;
  }

  input.classList.add("ff-input--error");
  errorEl.style.display = "flex";
  if (span) span.textContent = message;
}
