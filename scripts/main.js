// scripts/main.js

import { loadSettings, saveSettings, loadMonthData, saveMonthData } from "./core/storage.js";

// CATEGORIES
import { setCategoriesChangeHandler, renderCategories, initCategoriesModule } from "./categories/categories.js";

// MONTH
import { initMonthModule, renderMonth } from "./month/month.js";

// YEAR
import { initYearModule } from "./year/year.js"; 
import { renderYear } from "./year/year-render.js";
import { renderCategoriesList } from "./categories/categories-sheet.js";

// BACKUP
import { initBackupModule } from "./backup.js";

// CORE
import { resetCaches } from "./core/state.js";

// WIZARD
// Alleen setupWelcomeStartHandler is nog nodig (voor de knop-functionaliteit in HTML),
// de problematische maybeRunInitialWizard is verwijderd.
import { setupWelcomeStartHandler } from "./wizard/flow.js"; 


// CENTRAL DATA CHANGE HANDLER
function handleDataChanged() {
  resetCaches();
  renderYear();
  renderCategoriesList();
}

// MAIN STARTUP SEQUENCE
document.addEventListener("DOMContentLoaded", () => {

  // 1. Modules initialiseren. initYearModule bevat de GEFIXTE wizard-check.
  initYearModule(handleDataChanged);
  initMonthModule(handleDataChanged);
  initBackupModule(handleDataChanged);
  initCategoriesModule(); // Initialiseer de categorie module

  setCategoriesChangeHandler(handleDataChanged);

  // Koppel de handler, zodat deze overal beschikbaar is
  window.handleDataChanged = handleDataChanged;
  
  // Zorg ervoor dat de 'Aan de slag' knop op het welkomstscherm altijd werkt.
  setupWelcomeStartHandler();
});
