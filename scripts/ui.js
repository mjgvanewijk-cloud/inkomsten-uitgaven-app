// scripts/ui.js
export function initTabs(onTabChange) {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tabEl) => {
    tabEl.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabEl.classList.add("active");

      const target = tabEl.getAttribute("data-tab");
      const tabNames = ["categories", "month", "year"];

      tabNames.forEach((name) => {
        const pane = document.getElementById("tab-" + name);
        if (!pane) return;
        if (name === target) {
          pane.classList.remove("hidden");
        } else {
          pane.classList.add("hidden");
        }
      });

      if (typeof onTabChange === "function") {
        onTabChange(target);
      }
    });
  });
}
