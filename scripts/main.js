// scripts/main.js
import { initTabs } from "./ui.js";
import { initCategoriesModule, renderCategories } from "./categories.js";
import { initMonthModule, renderMonth } from "./month.js";
import { initYearModule, renderYear } from "./year.js";
import { resetCaches } from "./state.js";

function onDataChanged() {
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

  initCategoriesModule(onDataChanged);
  initMonthModule(onDataChanged);
  initYearModule(onDataChanged);
});
