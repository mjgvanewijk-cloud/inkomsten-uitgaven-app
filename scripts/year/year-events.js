// scripts/year/year-events.js
// Bevat de click handlers voor de jaar-tabel (cel-bewerkingen).

import { resetCaches } from "../core/state.js";
import { openCellEditOverlay } from "./year-ui.js";
import { renderYear } from "./year-render.js";

/**
 * Koppelt de click handlers aan alle '.clickable' cellen in de jaar-tabel.
 * Deze logica is 1-op-1 verplaatst uit year-render.js.
 * @param {HTMLTableSectionElement} tableBody
 * @param {number} year
 */
export function attachYearTableEvents(tableBody, year) {
  if (!tableBody) return;

  tableBody.querySelectorAll(".clickable").forEach((cell) => {
    cell.onclick = (e) => {
      const month = Number(e.currentTarget.dataset.month);
      const type = e.currentTarget.dataset.type;
      openCellEditOverlay(year, month, type, () => {
        resetCaches();
        renderYear();
      });
    };
  });
}
