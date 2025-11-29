// scripts/year.js
import {
  loadSettings,
  saveSettings,
  loadMonthData,
  saveMonthData,
} from "./storage.js";
import {
  currentYear,
  setCurrentYear,
  simulateYear,
  monthName,
  resetCaches,
  currentMonthKey,
  setCurrentMonthKey,
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
  const pill = document.getElementById("yearNavPill");
  if (!pill) return;

  pill.addEventListener("click", (e) => {
    const rect = pill.getBoundingClientRect();
    const isRight = (e.clientX - rect.left) > rect.width / 2;

    changeYear(isRight ? 1 : -1);

    pill.classList.add("nav-pill-active");
    setTimeout(() => pill.classList.remove("nav-pill-active"), 120);
  });
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

  // Bevestigingsvragen direct bij verlaten van de beginsaldo-velden
  const startInput = document.getElementById("startingSavingsInput");
  if (startInput) startInput.addEventListener("blur", handleSavingsBlur);

  const bankInput = document.getElementById("startingBankInput");
  if (bankInput) bankInput.addEventListener("blur", handleBankBlur);

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

  // Bepaal of er expliciete beginsaldi zijn opgeslagen voor dit jaar
  const hasExplicitSaving = Object.prototype.hasOwnProperty.call(yearStarting, year);
  const hasExplicitBank = Object.prototype.hasOwnProperty.call(yearBankStarting, year);

  if (startInput) {
    if (hasExplicitSaving) {
      const raw = yearStarting[year];
      const num = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (!isNaN(num)) {
        startInput.value = formatNumberInput(num);
      } else {
        startInput.value = "";
      }
    } else {
      startInput.value = savingStart !== 0 ? formatNumberInput(savingStart) : "";
    }
  }

  if (bankInput) {
    if (hasExplicitBank) {
      const raw = yearBankStarting[year];
      const num = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (!isNaN(num)) {
        bankInput.value = formatNumberInput(num);
      } else {
        bankInput.value = "";
      }
    } else {
      bankInput.value = bankStart !== 0 ? formatNumberInput(bankStart) : "";
    }
  }

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
    const { month, income, expense, available, bankEnd, savingEnd, monthSaving } = mInfo;

    totalIncome += income;
    totalExpense += expense;

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
    tdM.style.textAlign = "left";
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
tdS.classList.add("saving-cell");
tdS.innerHTML = `<span class="saving-text">${formatAmount0(monthSaving)}</span>
  <svg class="edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="#72ff9f">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>`;

// kleur behouden zoals origineel
if (!isRowEmpty && monthSaving !== 0) {
  tdS.style.color = monthSaving > 0 ? "#72ff9f" : "#ff8080";
}

tdS.onclick = () => {
  const yearNum = currentYear;
  const mStr = mInfo.month.toString().padStart(2, "0");
  const key = `${yearNum}-${mStr}`;
  setCurrentMonthKey(key);

  const overlay = document.getElementById("savingOverlay");
  const form = document.getElementById("savingForm");
  const amount = document.getElementById("savingAmountInput");

  if (overlay) overlay.classList.remove("hidden");
  if (form) form.classList.remove("hidden");

  // Bedrag zonder min-teken in popup
  amount.value = Math.abs(monthSaving) || "";

  const depBtn = document.getElementById("savingToggleDeposit");
  const wdrBtn = document.getElementById("savingToggleWithdrawal");

  // Toggle automatisch obv teken van bedrag
  if (monthSaving > 0) {
    if (depBtn) depBtn.click();
  } else if (monthSaving < 0) {
    if (wdrBtn) wdrBtn.click();
  } else {
    if (depBtn) depBtn.click();
  }

  const saveBtn = document.getElementById("saveSavingBtn");
  const origSave = saveBtn.onclick;
  saveBtn.onclick = () => {
    let val = amount.value.trim().replace(",", ".");
    let num = Number(val);
    if (isNaN(num) || num < 0) {
      alert("Ongeldig bedrag");
      return;
    }

    let md = loadMonthData();
    if (!md[key]) md[key] = { cats: {}, savings: [] };
    if (!Array.isArray(md[key].savings)) md[key].savings = [];

    // B1: alles vervangen door één nieuwe actie (of geen bij 0)
    md[key].savings = [];
    if (num > 0) {
      // bepaal type obv dataset-active (wordt in month.js gezet)
      let activeType = "deposit";
      if (depBtn && depBtn.dataset && depBtn.dataset.active === "0") {
        activeType = "withdrawal";
      }
      md[key].savings.push({ type: activeType, amount: num });
    }

    saveMonthData(md);
    form.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
    resetCaches();
    if (typeof onDataChanged === "function") onDataChanged();

    // oorspronkelijke handler herstellen
    saveBtn.onclick = origSave;
  };

  const cancelBtn = document.getElementById("cancelSavingBtn");
  const origCancel = cancelBtn.onclick;
  cancelBtn.onclick = () => {
    form.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
    cancelBtn.onclick = origCancel;
  };
};

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

  // Totals row: inkomens/uitgaven = som, overige kolommen = eindsaldo december
  const totalRow = document.createElement("tr");

  const tdLabel = document.createElement("td");
  tdLabel.textContent = "Totaal";
  tdLabel.style.fontWeight = "600";
  totalRow.appendChild(tdLabel);

  const isYearEmpty =
    totalIncome === 0 &&
    totalExpense === 0 &&
    totalSavingFlow === 0 &&
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
  tdTotAvail.textContent = formatAmount0(totalSavingFlow);
  tdTotAvail.style.fontWeight = "700";
  if (!isYearEmpty && totalSavingFlow !== 0) {
    tdTotAvail.style.color = totalSavingFlow > 0 ? "#72ff9f" : "#ff8080";
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




function handleSavingsBlur() {
  const sInput = document.getElementById("startingSavingsInput");
  if (!sInput) return;

  const settings = loadSettings();
  const year = currentYear;

  const sim = simulateYear(year);
  const prev = sim.savingStart;
  const prevIsZero = prev === 0;

  let v = sInput.value.trim();
  let num = Number(v.replace(",", "."));

  let changed = false;
  if (v === "" && !prevIsZero) {
    changed = true;
  } else if (v !== "") {
    if (!isNaN(num) && num !== prev) {
      changed = true;
    }
  }

  if (!changed) return;

  const ok = confirm("Weet je zeker dat je het beginsaldo spaarrekening wilt aanpassen?");
  if (!ok) {
    if (prevIsZero) {
      sInput.value = "";
    } else {
      sInput.value = formatNumberInput(prev);
    }
    return;
  }

  if (v === "" || isNaN(num)) {
    delete settings.yearStarting[year];
  } else {
    settings.yearStarting[year] = num;
  }

  saveSettings(settings);
  resetCaches();
  renderYear();
  if (typeof onDataChanged === "function") onDataChanged();
}

function handleBankBlur() {
  const bInput = document.getElementById("startingBankInput");
  if (!bInput) return;

  const settings = loadSettings();
  const year = currentYear;

  const sim = simulateYear(year);
  const prev = sim.bankStart;
  const prevIsZero = prev === 0;

  let v = bInput.value.trim();
  let num = Number(v.replace(",", "."));

  let changed = false;
  if (v === "" && !prevIsZero) {
    changed = true;
  } else if (v !== "") {
    if (!isNaN(num) && num !== prev) {
      changed = true;
    }
  }

  if (!changed) return;

  const ok = confirm("Weet je zeker dat je het beginsaldo bankrekening wilt aanpassen?");
  if (!ok) {
    if (prevIsZero) {
      bInput.value = "";
    } else {
      bInput.value = formatNumberInput(prev);
    }
    return;
  }

  if (v === "" || isNaN(num)) {
    delete settings.yearBankStarting[year];
  } else {
    settings.yearBankStarting[year] = num;
  }

  saveSettings(settings);
  resetCaches();
  renderYear();
  if (typeof onDataChanged === "function") onDataChanged();
}


function saveYearInputs() {
  const settings = loadSettings();
  const year = currentYear;

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



// expose handlers globally
window.handleBankBlur = handleBankBlur;
window.handleSavingsBlur = handleSavingsBlur;
