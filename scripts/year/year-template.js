// scripts/year/year-template.js
// Bevat de HTML-snippets en row-factory voor de jaar-tabel.

import { monthName } from "../core/state.js";
import { formatEuro, formatPlain, bankSignClass } from "./year-format.js";

/**
 * Maakt een <tr>-element voor een maandregel in de jaar-tabel.
 * De markup is 1-op-1 gelijk aan de vorige implementatie in year-render.js.
 * @param {number} year
 * @param {number} month
 * @param {{ income:number, expense:number, savingFlow:number, bank:number, saving:number }} data
 * @param {boolean} active
 * @returns {HTMLTableRowElement}
 */
export function createMonthRow(year, month, data, active) {
  const m = month;
  const d = data || { income: 0, expense: 0, savingFlow: 0, bank: 0, saving: 0 };

  const row = document.createElement("tr");
  row.className = active ? "month-row" : "month-row month-inactive";

  row.innerHTML = `
            <td>${monthName(m)}</td>

            <!-- INKOMEN (euro + potlood, GEEN kleur) -->
            <td class="clickable" data-month="${m}" data-type="income">
                ${active
                  ? `<div class="ff-cell-edit">
                        <span class="ff-amount">${formatEuro(d.income)}</span>
                        <span class="ff-edit-icon">✎</span>
                      </div>`
                  : "-"
                }
            </td>

            <!-- UITGAVEN (euro + potlood, GEEN kleur) -->
            <td class="clickable" data-month="${m}" data-type="expense">
                ${active
                  ? `<div class="ff-cell-edit">
                        <span class="ff-amount">${formatEuro(d.expense)}</span>
                        <span class="ff-edit-icon">✎</span>
                      </div>`
                  : "-"
                }
            </td>

            <!-- STORTING SPAAR (GEEN € + potlood, GEEN kleur) -->
            <td class="clickable" data-month="${m}" data-type="saving">
                ${active
                  ? `<div class="ff-cell-edit">
                        <span class="ff-amount">${formatPlain(d.savingFlow)}</span>
                        <span class="ff-edit-icon">✎</span>
                      </div>`
                  : "-"
                }
            </td>

            <!-- EINDSALDO BANK (ENIGE kolom die rood/groen mag zijn) -->
            <td class="${bankSignClass(d.bank)}">
                ${active ? formatEuro(d.bank) : "-"}
            </td>

            <!-- EINDSALDO SPAAR (nooit kleur) -->
            <td class="saving-end-cell">
                ${active ? formatEuro(d.saving) : "-"}
            </td>
        `;

  return row;
}

/**
 * Schrijft de totalen-rij onderaan de tabel.
 * Markup is identiek aan de vorige implementatie in year-render.js.
 */
export function updateTotalsRow(totalRow, yearlyInc, yearlyExp, yearlyFlow, lastBank, lastSaving) {
  if (!totalRow) return;
  totalRow.innerHTML = `
            <td>Totaal</td>
            <td>${formatEuro(yearlyInc)}</td>
            <td>${formatEuro(yearlyExp)}</td>
            <td>${formatPlain(yearlyFlow)}</td>
            <td class="${bankSignClass(lastBank)}">${formatEuro(lastBank)}</td>
            <td>${formatEuro(lastSaving)}</td>
        `;
}
