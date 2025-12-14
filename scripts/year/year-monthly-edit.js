// scripts/year/year-monthly-edit.js
// Logica voor de cel-bewerkingspop-up (Inkomen, Uitgaven, Sparen).

import { loadMonthData, saveMonthData } from "../core/storage.js";
import { monthName, getCategories } from "../core/state.js";
import { 
    createPopupContainer, 
    attachEscapeToClose, 
    attachPopupCloseOnOverlayClick 
} from "../ui/popups.js";

import { formatAmount0, formatAmount2, parseNumberInput } from "./year-utils.js";

// === Cel-Bewerkings Popup ===

let editContext = {
    year: null,
    month: null,
    type: null,
    onDataChanged: null,
    // Voeg hier eventuele andere benodigde context toe, zoals applyMode, etc.
};


/**
 * Opent de pop-up om de maandelijkse inkomen/uitgave/spaar-cellen te bewerken.
 */
export function openMonthEditPopup(year, month, type, onDataChanged) {
    editContext = { year, month, type, onDataChanged };
    
    const { overlay, content } = createPopupContainer();
    const overlayId = "cellEditOverlay"; // Gebruik een vaste ID
    overlay.id = overlayId;
    
    let title = '';
    let categorySelect = '';

    if (type === 'income') {
        title = `Inkomsten bewerken (${monthName(month)} ${year})`;
        categorySelect = createCategorySelect(year, month, 'income');
    } else if (type === 'expense') {
        title = `Uitgaven bewerken (${monthName(month)} ${year})`;
        categorySelect = createCategorySelect(year, month, 'expense');
    } else if (type === 'saving') {
        title = `Sparen/Opnemen bewerken (${monthName(month)} ${year})`;
        categorySelect = ''; // Sparen heeft geen categorieën
    }
    
    // Hier zou een gedetailleerde formulier komen voor het bewerken van bedragen per categorie of in totaal.
    // Voor nu is dit een vereenvoudigde versie.
    content.innerHTML = `
        <div class="popup-header"><h2>${title}</h2></div>
        <form id="cellEditForm" class="popup-body">
            <div class="form-group">
                <label for="totalAmountInput">Totaal Bedrag</label>
                <input type="text" id="totalAmountInput" class="ff-input" placeholder="0,00" />
            </div>
            ${categorySelect}
            
            <div class="form-group form-actions">
                <label for="applyMode">Toepassen op:</label>
                <select id="applyModeSelect" class="ff-select">
                    <option value="this">Alleen deze maand</option>
                    <option value="all">Deze maand en volgende</option>
                </select>
            </div>
        </form>
        <div class="popup-footer">
            <button class="ff-btn ff-btn--primary" id="saveCellEditBtn">Opslaan</button>
            <button class="ff-btn ff-btn--secondary" id="cancelCellEditBtn">Annuleren</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Koppel handlers
    document.getElementById("cancelCellEditBtn").onclick = closeCellEditOverlay;
    document.getElementById("saveCellEditBtn").onclick = handleCellEditSave;

    attachEscapeToClose(overlay, closeCellEditOverlay);
    attachPopupCloseOnOverlayClick(overlay, closeCellEditOverlay);

    // Laad bestaande data (indien aanwezig)
    loadCellDataIntoForm(year, month, type);
}

/**
 * Sluit de celbewerkingspop-up.
 */
function closeCellEditOverlay() {
    const overlay = document.getElementById("cellEditOverlay");
    if (overlay) {
        document.body.removeChild(overlay);
    }
    // Zorg ervoor dat de UI wordt ververst na het sluiten
    if (editContext.onDataChanged) {
        editContext.onDataChanged(); 
    }
}

/**
 * Vult het formulier met de bestaande data.
 */
function loadCellDataIntoForm(year, month, type) {
    const monthData = loadMonthData(year, month);
    const amountInput = document.getElementById("totalAmountInput");

    if (type === 'saving') {
        // Sparen is eenvoudig: het is het 'manualSaving' bedrag
        const amount = monthData.manualSaving || 0;
        if (amountInput) amountInput.value = formatAmount2(amount);

    } else if (type === 'income' || type === 'expense') {
        // Inkomen/Uitgave: dit is complexer, de totale som van alle categorieën
        const data = monthData[type] || {};
        const totalAmount = data.amount || 0;
        if (amountInput) amountInput.value = formatAmount2(totalAmount);
        
        // Categorieën moeten ook gevuld worden, maar dat is een grote implementatie
    }
}

/**
 * Verwerkt het opslaan van de celbewerkingspop-up.
 */
function handleCellEditSave(e) {
    e.preventDefault();
    const { year, month, type, onDataChanged } = editContext;
    const amountInput = document.getElementById("totalAmountInput");
    const applyModeSelect = document.getElementById("applyModeSelect");

    // 1. Haal de waarden op
    const amount = parseNumberInput(amountInput.value);
    const applyMode = applyModeSelect.value;
    
    if (isNaN(amount)) {
        alert("Voer een geldig bedrag in.");
        return;
    }

    // 2. Data opslaan (Voorbeeld: alleen het totaal opslaan)
    const monthData = loadMonthData(year, month);
    
    if (type === 'saving') {
        // Sparen/Opnemen
        monthData.manualSaving = amount;
        // monthData.manualSavingType = (amount >= 0) ? 'deposit' : 'withdraw'; // Type wordt bepaald door teken
        
    } else if (type === 'income' || type === 'expense') {
        // Inkomen/Uitgave (Vereenvoudigd: sla alleen het totaal op zonder categorieën)
        monthData[type] = {
            amount: amount,
            cats: {}, // In de volledige app zou je hier de gesplitste categorieën opslaan
            cat: 0, 
        };
    }

    saveMonthData(year, month, monthData);

    // 3. Toepassen op volgende maanden (Indien 'all' geselecteerd)
    // De implementatie van 'all' is complex en wordt hier weggelaten, dit zou logica in year-storage.js vereisen.

    closeCellEditOverlay();
}


/**
 * Creëert de HTML voor de categorie-selectie (voor Income/Expense).
 */
function createCategorySelect(year, month, type) {
    const categories = getCategories();
    // Dit zou een complexere structuur moeten zijn met meerdere inputvelden
    // om het bedrag over verschillende categorieën te splitsen (de 'Split' functie).
    
    return `
        <div class="form-group category-split-area">
            <h4>Verdeling over categorieën (TODO: Split Functionaliteit)</h4>
            <p class="ff-helptext">De geavanceerde split-functie om bedragen over meerdere categorieën te verdelen komt hier.</p>
        </div>
    `;
}