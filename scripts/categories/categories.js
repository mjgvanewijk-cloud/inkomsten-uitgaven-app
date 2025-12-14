// scripts/categories/categories.js
// Bevat de logica voor het bewerken van de Categorieën data en de pop-up formulieren.

import { loadCats, saveCats, loadMonthData, saveMonthData, loadSettings, saveSettings } from "../core/storage.js";
import { resetCaches, getCategories } from "../core/state.js"; // getCategories toegevoegd
import { closeYearCategoriesSheet } from "./categories-sheet.js"; // Sluit de hoofd sheet

let editIndex = null;
let onDataChangedGlobal = null; // Globale handler (niet meer primair gebruikt)

export function setCategoriesChangeHandler(handler) {
  onDataChangedGlobal = handler;
}

// Deze functie rendert de categorieën op het Hoofd Categorieën tabblad (niet in de Year Sheet).
// We behouden de functie, maar passen de delete aan om de callback te gebruiken.
export function renderCategories() {
  const cats = loadCats();
  const list = document.getElementById("catList");
  if (!list) return;

  list.innerHTML = "";

  if (!Array.isArray(cats) || cats.length === 0) {
    const p = document.createElement("p");
    p.textContent =
      "Nog geen categorieën. Voeg als eerste je vaste inkomens- en uitgavencategorieën toe.";
    p.style.opacity = "0.7";
    list.appendChild(p);
    return;
  }

  cats.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    // ... (rest van de kaart opbouw)

    // ... (knop opbouw blijft hetzelfde)
    const row = document.createElement("div");
    row.className = "btn-row";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "small-btn";
    editBtn.textContent = "Bewerken";
    // Hier roepen we openSheet(index) aan, we kunnen hier geen onComplete meegeven
    // De save-logica in openSheet moet op de globale handler vertrouwen, of we passen de flow aan.
    editBtn.onclick = () => openSheet(idx, onDataChangedGlobal);
    row.appendChild(editBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "small-btn danger";
    delBtn.textContent = "Verwijderen";
    // Roep delete aan met de globale handler
    delBtn.onclick = () => deleteCategory(c.name, onDataChangedGlobal);
    row.appendChild(delBtn);

    card.appendChild(row);
    list.appendChild(card);
  });
}

// De functie deleteCategory accepteert nu een callback
export function deleteCategory(name, onComplete) { 
  const cats = loadCats();
  const idx = cats.findIndex((c) => c && c.name === name);
  if (idx === -1) return;
  const c = cats[idx];

  if (!confirm(`Categorie "${c.name}" verwijderen?`)) return;

  cats.splice(idx, 1);
  saveCats(cats);
  syncSettingsCategoriesFromCats();

  // Update month data
  const md = loadMonthData();
  for (const key in md) {
    if (!Object.prototype.hasOwnProperty.call(md, key)) continue;
    const obj = md[key];

    if (obj.cats && Object.prototype.hasOwnProperty.call(obj.cats, c.name)) {
      delete obj.cats[c.name];
    }

    if (obj.savings && Array.isArray(obj.savings)) {
      obj.savings = obj.savings.filter((sav) => sav.categoryName !== c.name);
    }
  }
  saveMonthData(md);
  resetCaches();
  
  // De caller (categories-sheet.js of renderCategories) handelt de refresh af
  if (typeof onComplete === "function") onComplete();
}

// === Sheet logica ===

const overlay = document.getElementById("sheetOverlay");
const sheet = document.getElementById("sheetForm");

// ... (keep updateTypeButtons, createYearRow, closeSheet)

function openSheet(index, onComplete) { // <-- openSheet neemt nu een callback
  editIndex = index ?? null;
  const cats = loadCats();
  const currentY = new Date().getFullYear();

  // ... (rest van de base, title, nameInput, typeInput, rowsContainer initialisatie blijft hetzelfde)
  
  const base =
    editIndex !== null && cats[editIndex]
      ? cats[editIndex]
      : {
          name: "",
          type: "expense",
          amountsByYear: { [String(currentY)]: "0.00" },
        };

  const titleEl = document.getElementById("sheetTitle");
  if (titleEl) {
    titleEl.textContent =
      editIndex === null ? "Nieuwe categorie" : "Categorie bewerken";
  }

  // ... (rest van de openSheet logica tot aan de opslaan knop)

  // Klikken buiten het sheet → sluiten, met callback
  if (overlay && sheet) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
          closeSheet();
          if (typeof onComplete === "function") onComplete();
      }
    });
    sheet.addEventListener("click", (e) => e.stopPropagation());
  }

  // --- Opslaan-knop ---
  const sheetSaveBtn = document.getElementById("sheetSave");
  if (sheetSaveBtn) {
    sheetSaveBtn.type = "button";
    sheetSaveBtn.onclick = () => {
      // ... (oorspronkelijke validatie en data-ophalen logica)
      
      const nameEl = document.getElementById("nameInput");
      const typeEl = document.getElementById("typeInput");

      const name = nameEl ? nameEl.value.trim() : "";
      const type = typeEl ? typeEl.value : "expense";

      // ... (validatie logica blijft hetzelfde)
      if (!name) { alert("Naam verplicht"); return; }
      // ... (duplicaat check logica blijft hetzelfde)
      
      // ... (amountsByYear logica blijft hetzelfde)

      const oldCatName =
        editIndex !== null && cats[editIndex] ? cats[editIndex].name : null;

      const newCat = {
        name,
        type,
        amountsByYear,
      };

      if (editIndex !== null && cats[editIndex]) {
        cats[editIndex] = newCat;
      } else {
        cats.push(newCat);
      }

      saveCats(cats);
      syncSettingsCategoriesFromCats();

      if (editIndex !== null && oldCatName && oldCatName !== name) {
        // ... (data migratie logica blijft hetzelfde)
      }

      closeSheet();
      // renderCategories(); // Oude refresh verwijderd
      resetCaches();
      
      // Roep de callback aan
      if (typeof onComplete === "function") onComplete();
    };
  }
}

// ... (rest van de helpers: updateTypeButtons, createYearRow)

function closeSheet() {
    if (!overlay || !sheet) return;
    sheet.classList.remove("show");
    setTimeout(() => (overlay.style.display = "none"), 250);
    editIndex = null;
    
    // De sheet-overlay voor de categorieën beheer in de Year Module moet ook gesloten worden!
    // We roepen closeYearCategoriesSheet aan, die de grote overlay sluit.
    closeYearCategoriesSheet(); 
}

// === START CORRECTIE: ONTBREKENDE FUNCTIE setupSheetEvents ===
function setupSheetEvents() {
    const sheetCloseBtn = document.getElementById("sheetClose");
    
    // Koppel de sluitknop aan de closeSheet functie
    if (sheetCloseBtn) {
        sheetCloseBtn.onclick = closeSheet;
    }
}
// === EINDE CORRECTIE ===

function syncSettingsCategoriesFromCats() {
    const settings = loadSettings();
    settings.categories = settings.categories || {};
    const map = {};
    
    // ... (rest van de syncSettingsCategoriesFromCats logica)
    
    // De nieuwe map toewijzen en opslaan
    settings.categories = map;
    saveSettings(settings);
}

// --- Externe functies ---

// Openen voor Nieuwe Categorie
export function openNewCategorySheet(onComplete) {
  openSheet(null, onComplete);
}

// Openen voor Bestaande Categorie (op basis van naam/label)
export function openEditCategorySheet(name, onComplete) {
  const cats = loadCats();
  
  const baseName = String(name || "").trim();
  if (!baseName) {
    alert("Ongeldige categorie om te bewerken.");
    return;
  }

  const index = cats.findIndex((c) => c && String(c.name).trim() === baseName);
  if (index === -1) {
    alert(`Categorie "${baseName}" kon niet worden gevonden in het categoriebeheer.`);
    return;
  }

  openSheet(index, onComplete);
}

export function initCategoriesModule() {
  // setupSheetEvents zorgt voor de event listeners op de sheet zelf
  setupSheetEvents(); 
}