// scripts/main.js
import { initTabs } from "./ui.js";
import { setCategoriesChangeHandler, renderCategories } from "./categories.js";
import { initMonthModule, renderMonth } from "./month.js";
import { initYearModule, renderYear } from "./year.js";
import { initBackupModule } from "./backup.js";
import { resetCaches } from "./state.js";

function handleDataChanged() {
  resetCaches();
  const activeEl = document.querySelector(".tab.active");
  const activeTab = activeEl ? activeEl.getAttribute("data-tab") : null;
  if (activeTab === "month") renderMonth();
  if (activeTab === "year") renderYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs((tab) => {
    if (tab === "categories") renderCategories();
    if (tab === "month") renderMonth();
    if (tab === "year") renderYear();
  });

  setCategoriesChangeHandler(handleDataChanged);
  initMonthModule(handleDataChanged);
  initYearModule(handleDataChanged);
  initBackupModule(handleDataChanged);

  // Start in de huidige actieve tab (meestal categorieën of maand)
  const activeEl = document.querySelector(".tab.active");
  const activeTab = activeEl ? activeEl.getAttribute("data-tab") : "categories";
  if (activeTab === "categories") renderCategories();
  if (activeTab === "month") renderMonth();
  if (activeTab === "year") renderYear();
});
