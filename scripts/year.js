// scripts/year.js
import {
  loadSettings,
  saveSettings,
} from "./storage.js";
import {
  currentYear,
  setCurrentYear,
  computeMonthTotalsFor,
  simulateYear,
  monthName,
  resetCaches,
} from "./state.js";

let onDataChanged = null;
let yearMonthlyType = "deposit";

function formatNumberInput(val) {
  if (val === null || val === undefined) return "";
  if (typeof val !== "number" || isNaN(val)) return "";
  return val.toFixed(2).replace(".", ",");
}
let yearDepBtn = null;
let yearWdrBtn = null;

function updateYearButtons(type) {
  yearMonthlyType = type;
  const depBtn = yearDepBtn || document.getElementById("yearToggleDeposit");
  const wdrBtn = yearWdrBtn || document.getElementById("yearToggleWithdrawal");
  yearDepBtn = depBtn;
  yearWdrBtn = wdrBtn;
  if (!depBtn || !wdrBtn) return;

  if (type === "deposit") {
    depBtn.style.background = "#80ff80";
    depBtn.style.color = "#4ba7ff";
    wdrBtn.style.background = "#191b30";
    wdrBtn.style.color = "#4ba7ff";
  } else {
    wdrBtn.style.background = "#ff8080";
    wdrBtn.style.color = "#4ba7ff";
    depBtn.style.background = "#191b30";
    depBtn.style.color = "#4ba7ff";
  }
}


export function initYearModule(onChange) {
  onDataChanged = onChange;
  setupYearNavigation();
  setupYearButtons();
  renderYear();
}

function setupYearNavigation() {
  const prev = document.getElementById("prevYearBtn");
  const next = document.getElementById("nextYearBtn");
  if (prev) prev.addEventListener("click", () => changeYear(-1));
  if (next) next.addEventListener("click", () => changeYear(1));
}


function setupYearButtons() {
  const depBtn = document.getElementById("yearToggleDeposit");
  const wdrBtn = document.getElementById("yearToggleWithdrawal");

  yearDepBtn = depBtn;
  yearWdrBtn = wdrBtn;

  if (depBtn) depBtn.onclick = () => updateYearButtons("deposit");
  if (wdrBtn) wdrBtn.onclick = () => updateYearButtons("withdrawal");

  const saveBtn = document.getElementById("saveSettingsBtn");
  if (saveBtn) saveBtn.onclick = saveYearInputs;

  // Initial state based on current yearMonthlyType
  updateYearButtons(yearMonthlyType);
}
function changeYear(offset) {
  setCurrentYear(currentYear + offset);
  resetCaches();
  renderYear();
}


export function renderYear() {
  const settings = loadSettings();
  const { yearStarting, yearBankStarting, yearMonthlySaving } = settings;

  const year = currentYear;

  // Simuleer jaar voor startsaldi + maandoverzichten
  const sim = simulateYear(year);
  const savingStart = sim.savingStart;
  const bankStart = sim.bankStart;

  const yt = document.getElementById("yearTitle");
  if (yt) yt.textContent = "Jaar: " + year;

  const startInput = document.getElementById("startingSavingsInput");
  const bankInput = document.getElementById("startingBankInput");
  const msAmount = document.getElementById("monthlySavingAmount");

  // Alleen expliciete beginsaldi tonen; doorrol-waarden tonen als getal, maar blijven overschrijfbaar
  if (startInput) startInput.value = savingStart !== 0 ? formatNumberInput(savingStart) : "";
  if (bankInput) bankInput.value = bankStart !== 0 ? formatNumberInput(bankStart) : "";

  const ym = Object.prototype.hasOwnProperty.call(yearMonthlySaving, year)
    ? yearMonthlySaving[year]
    : null;

  if (ym && msAmount) {
    const amt = typeof ym.amount === "number"
      ? ym.amount
      : Number(String(ym.amount).replace(",", "."));
    if (!isNaN(amt)) {
      msAmount.value = formatNumberInput(amt);
    } else {
      msAmount.value = "";
    }
    yearMonthlyType = ym.type || "deposit";
  } else if (msAmount) {
    msAmount.value = "";
    yearMonthlyType = "deposit";
  }

  updateYearButtons(yearMonthlyType);

  const tbody = document.getElementById("yearTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalIncome = 0;
  let totalExpense = 0;

  const months = sim.months;

  // Bepaal december-eindsaldi
  let lastAvail = 0;
  let lastBank = sim.bankStart;
  let lastFictive = sim.savingStart;

  if (months.length) {
    const last = months[months.length - 1];
    lastBank = last.bankEnd;
    lastFictive = last.savingEnd;
  }

  let totalSavingFlow = 0;

  const formatAmount0 = (val) => {
    const rounded = Math.round(val);
    return "€\u00A0" + rounded.toString().replace(".", ",");
  };

  // Maandrijen opbouwen
  for (const mInfo of months) {
    const { month, income, expense, available, bankEnd, savingEnd } = mInfo;

    totalIncome += income;
    totalExpense += expense;

    // Bepaal maandelijkse storting/opname spaarrekening (handmatig leading)
    let monthSaving = 0;

    const t = computeMonthTotalsFor(year, month);
    const yms = Object.prototype.hasOwnProperty.call(yearMonthlySaving, year)
      ? yearMonthlySaving[year]
      : null;

    if (t) {
      if (t.hasManualSavings) {
        // Handmatige spaaracties leidend: automatische spaaractie telt niet mee
        monthSaving = t.deposits - t.withdrawals;
      } else if (yms) {
        if (yms.type === "deposit") {
          monthSaving = t.deposits + yms.amount - t.withdrawals;
        } else if (yms.type === "withdrawal") {
          monthSaving = t.deposits - (t.withdrawals + yms.amount);
        }
      } else {
        monthSaving = t.deposits - t.withdrawals;
      }
    }

    totalSavingFlow += monthSaving;

    const isRowEmpty =
      income === 0 &&
      expense === 0 &&
      available === 0 &&
      bankEnd === 0 &&
      savingEnd === 0;

    const tr = document.createElement("tr");

    const tdM = document.createElement("td");
    tdM.textContent = monthName(month);
    tdM.style.fontWeight = "600";
    tr.appendChild(tdM);

    const tdI = document.createElement("td");
    tdI.textContent = formatAmount0(income);
    if (!isRowEmpty) {
      if (income > 0) tdI.style.color = "#72ff9f";
      else if (income < 0) tdI.style.color = "#ff8080";
    }
    tr.appendChild(tdI);

    const tdE = document.createElement("td");
    tdE.textContent = formatAmount0(expense);
    if (!isRowEmpty && expense !== 0) {
      tdE.style.color = "#ff8080";
    }
    tr.appendChild(tdE);

    const tdS = document.createElement("td");
    tdS.textContent = formatAmount0(monthSaving);
    if (!isRowEmpty && monthSaving !== 0) {
      tdS.style.color = monthSaving > 0 ? "#72ff9f" : "#ff8080";
    }
    tr.appendChild(tdS);

    const tdBank = document.createElement("td");
    tdBank.textContent = formatAmount0(bankEnd);
    if (!isRowEmpty) {
      if (bankEnd > 0) tdBank.style.color = "#72ff9f";
      else if (bankEnd < 0) tdBank.style.color = "#ff8080";
    }
    tr.appendChild(tdBank);

    const tdSav = document.createElement("td");
    tdSav.textContent = formatAmount0(savingEnd);
    if (!isRowEmpty) {
      if (savingEnd > 0) tdSav.style.color = "#72ff9f";
      else if (savingEnd < 0) tdSav.style.color = "#ff8080";
    }
    tr.appendChild(tdSav);

    tbody.appendChild(tr);
  }

  // Gebruik totalSavingFlow als jaarresultaat voor 'Storting spaar'
  lastAvail = totalSavingFlow;

  // Totals row: inkomens/uitgaven = som, overige kolommen = eindsaldo december
  const totalRow = document.createElement("tr");

  const tdLabel = document.createElement("td");
  tdLabel.textContent = "Totaal";
  tdLabel.style.fontWeight = "600";
  totalRow.appendChild(tdLabel);

  const isYearEmpty =
    totalIncome === 0 &&
    totalExpense === 0 &&
    lastAvail === 0 &&
    lastBank === 0 &&
    lastFictive === 0;

  const tdTotInc = document.createElement("td");
  tdTotInc.textContent = formatAmount0(totalIncome);
  tdTotInc.style.fontWeight = "700";
  if (!isYearEmpty && totalIncome !== 0) {
    tdTotInc.style.color = "#72ff9f";
  }
  totalRow.appendChild(tdTotInc);

  const tdTotExp = document.createElement("td");
  tdTotExp.textContent = formatAmount0(totalExpense);
  tdTotExp.style.fontWeight = "700";
  if (!isYearEmpty && totalExpense !== 0) {
    tdTotExp.style.color = "#ff8080";
  }
  totalRow.appendChild(tdTotExp);

  const tdTotAvail = document.createElement("td");
  tdTotAvail.textContent = formatAmount0(lastAvail);
  tdTotAvail.style.fontWeight = "700";
  if (!isYearEmpty && lastAvail !== 0) {
    tdTotAvail.style.color = lastAvail > 0 ? "#72ff9f" : "#ff8080";
  }
  totalRow.appendChild(tdTotAvail);

  const tdTotBank = document.createElement("td");
  tdTotBank.textContent = formatAmount0(lastBank);
  tdTotBank.style.fontWeight = "700";
  if (!isYearEmpty && lastBank !== 0) {
    tdTotBank.style.color = lastBank > 0 ? "#72ff9f" : "#ff8080";
  }
  totalRow.appendChild(tdTotBank);

  const tdTotSav = document.createElement("td");
  tdTotSav.textContent = formatAmount0(lastFictive);
  tdTotSav.style.fontWeight = "700";
  if (!isYearEmpty && lastFictive !== 0) {
    tdTotSav.style.color = lastFictive > 0 ? "#72ff9f" : "#ff8080";
  }
  totalRow.appendChild(tdTotSav);

  tbody.appendChild(totalRow);
}



function saveYearInputs() {
  const settings = loadSettings();
  const year = currentYear;

  // Bepaal de huidige doorrol-beginsaldi (inclusief bestaande overrides)
  const sim = simulateYear(year);
  const defaultSavingStart = sim.savingStart;
  const defaultBankStart = sim.bankStart;

  const sInput = document.getElementById("startingSavingsInput");
  if (sInput) {
    let v = sInput.value.trim();
    let num = Number(v.replace(",", "."));
    if (v === "" || isNaN(num)) {
      // leeg veld -> geen expliciete override
      delete settings.yearStarting[year];
    } else {
      // altijd opslaan wat de gebruiker opgeeft
      settings.yearStarting[year] = num;
    }
  }

  const bInput = document.getElementById("startingBankInput");
  if (bInput) {
    let v = bInput.value.trim();
    let num = Number(v.replace(",", "."));
    if (v === "" || isNaN(num)) {
      delete settings.yearBankStarting[year];
    } else {
      // altijd opslaan wat de gebruiker opgeeft
      settings.yearBankStarting[year] = num;
    }
  }

  const msInput = document.getElementById("monthlySavingAmount");
  if (msInput) {
    let v = msInput.value.trim();
    let num = Number(v.replace(",", "."));

    if (v === "" || isNaN(num)) {
      delete settings.yearMonthlySaving[year];
    } else {
      settings.yearMonthlySaving[year] = {
        amount: num,
        type: yearMonthlyType,
      };
    }
  }

  saveSettings(settings);
  resetCaches();
  renderYear();
  if (typeof onDataChanged === "function") onDataChanged();
}
