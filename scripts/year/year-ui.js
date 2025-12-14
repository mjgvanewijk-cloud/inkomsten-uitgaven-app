// scripts/year/year-ui.js
// Bevat UI-functies die door year.js en year-render.js worden aangeroepen.

import { monthName } from "../core/state.js";
import { 
    createPopupContainer, 
    attachEscapeToClose, 
    attachPopupCloseOnOverlayClick 
} from "../ui/popups.js";

// Functie voor de cel-edit popup moet hier nog geïmporteerd worden (veronderstel dat deze elders is)
// Tenzij we de logica van year-monthly-edit.js hierheen verplaatsen.
// Voor nu exporteren we de shell:

/**
 * Opent de overlay om een cel (inkomen/uitgave/sparen) te bewerken.
 * De volledige logica bevindt zich in year-monthly-edit.js
 * @param {number} year 
 * @param {number} month 
 * @param {string} type - 'income', 'expense' of 'saving'
 * @param {function} onDataChanged - Callback na opslaan/sluiten.
 */
export async function openCellEditOverlay(year, month, type, onDataChanged) {
    // Importeer de logica van de cel-edit direct bij het aanroepen (Lazy loading)
    const { openMonthEditPopup } = await import('./year-monthly-edit.js');
    
    // Roep de echte popup functie aan
    openMonthEditPopup(year, month, type, onDataChanged);
}


/**
 * Update de knoppen voor het maandelijks sparen/opnemen
 * @param {string} type - 'deposit' of 'withdraw'
 */
export function updateYearButtons(type) {
    const depositBtn = document.getElementById('monthlySavingTypeDeposit');
    const withdrawBtn = document.getElementById('monthlySavingTypeWithdraw');

    if (depositBtn) {
        depositBtn.classList.toggle('ff-btn--primary', type === 'deposit');
        depositBtn.classList.toggle('ff-btn--secondary', type !== 'deposit');
    }
    if (withdrawBtn) {
        withdrawBtn.classList.toggle('ff-btn--primary', type === 'withdraw');
        withdrawBtn.classList.toggle('ff-btn--secondary', type !== 'withdraw');
    }
}

// === HANDLER VOOR MONTHLY SAVING TYPE KNOPPEN ===
// Deze functie moet globaal beschikbaar worden in de DOM, dus we plaatsen de event listener in year.js
// of voegen deze toe aan window (wat we doen in year.js)