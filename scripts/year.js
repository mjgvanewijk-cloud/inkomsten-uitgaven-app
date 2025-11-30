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
  const prev = document.getElementById("yearNavPrev");
  const next = document.getElementById("yearNavNext");

  if (!pill) return;

  pill.addEventListener("click", (e) => {
    const rect = pill.getBoundingClientRect();
    const isRight = e.clientX - rect.left > rect.width / 2;
    changeYear(isRight ? 1 : -1);
    pill.classList.add("nav-pill-active");
    setTimeout(() => pill.classList.remove("nav-pill-active"), 120);
  });

  if (prev) {
    prev.addEventListener("click", (e) => {
      e.stopPropagation();
      changeYear(-1);
      pill.classList.add("nav-pill-active");
      setTimeout(() => pill.classList.remove("nav-pill-active"), 120);
    });
  }

  if (next) {
    next.addEventListener("click", (e) => {
      e.stopPropagation();
      changeYear(1);
      pill.classList.add("nav-pill-active");
      setTimeout(() => pill.classList.remove("nav-pill-active"), 120);
    });
  }
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

  const startInput = document.getElementById("startingSavingsInput");
  if (startInput) startInput.addEventListener("blur", handleSavingsBlur);

  const bankInput = document.getElementById("startingBankInput");
  if (bankInput) bankInput.addEventListener("blur", handleBankBlur);

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

  const sim = simulateYear(year);
  const savingStart = sim.savingStart;
  const bankStart = sim.bankStart;

  const yt = document.getElementById("yearTitle");
  if (yt) yt.textContent = "Jaar: " + year;

  const startInput = document.getElementById("startingSavingsInput");
  const bankInput = document.getElementById("startingBankInput");
  const msAmount = document.getElementById("monthlySavingAmount");

  const hasExplicitSaving = Object.prototype.hasOwnProperty.call(
    yearStarting,
    year
  );

  const hasExplicitBank = Object.prototype.hasOwnProperty.call(
    yearBankStarting,
    year
  );

  if (startInput) {
    if (hasExplicitSaving) {
      const raw = yearStarting[year];
      const num =
        typeof raw === "number"
          ? raw
          : Number(String(raw).replace(",", "."));
      startInput.value = !isNaN(num) ? formatNumberInput(num) : "";
    } else {
      startInput.value =
        savingStart !== 0 ? formatNumberInput(savingStart) : "";
    }
  }

  if (bankInput) {
    if (hasExplicitBank) {
      const raw = yearBankStarting[year];
      const num =
        typeof raw === "number"
          ? raw
          : Number(String(raw).replace(",", "."));
      bankInput.value = !isNaN(num) ? formatNumberInput(num) : "";
    } else {
      bankInput.value = bankStart !== 0 ? formatNumberInput(bankStart) : "";
    }
  }

  // Maandelijks spaarbedrag bovenin wordt ALLEEN bepaald door yearMonthlySaving
  let ym = null;
  if (
    yearMonthlySaving &&
    Object.prototype.hasOwnProperty.call(yearMonthlySaving, year)
  ) {
    ym = yearMonthlySaving[year];
  }

  if (msAmount) {
    if (ym && typeof ym.amount === "number" && ym.amount > 0) {
      msAmount.value = ym.amount.toFixed(2).replace(".", ",");
      yearMonthlyType = ym.type || "deposit";
    } else {
      msAmount.value = "";
      yearMonthlyType = "deposit";
    }
  }

  updateYearButtons(yearMonthlyType);

  const tbody = document.getElementById("yearTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavingFlow = 0;

  const months = sim.months;

  let lastBank = sim.bankStart;
  let lastSaving = sim.savingStart;

  if (months.length) {
    const last = months[months.length - 1];
    lastBank = last.bankEnd;
    lastSaving = last.savingEnd;
  }

  const formatAmount0 = (v) =>
    "€ " + Math.round(v).toString().replace(".", ",");

  const monthData = loadMonthData();

  for (const mInfo of months) {
    const {
      month,
      income,
      expense,
      available,
      bankEnd,
      savingEnd,
      monthSaving,
    } = mInfo;

    totalIncome += income;
    totalExpense += expense;
    totalSavingFlow += monthSaving;

    const tr = document.createElement("tr");

    const tdM = document.createElement("td");
    tdM.textContent = monthName(month);
    tdM.style.textAlign = "left";
    tdM.style.fontWeight = "600";
    tr.appendChild(tdM);

    const isRowEmpty =
      income === 0 &&
      expense === 0 &&
      available === 0 &&
      bankEnd === 0 &&
      savingEnd === 0;

    const tdI = document.createElement("td");
    tdI.textContent = formatAmount0(income);
    if (!isRowEmpty && income !== 0) tdI.style.color = "#72ff9f";
    tr.appendChild(tdI);

    const tdE = document.createElement("td");
    tdE.textContent = formatAmount0(expense);
    if (!isRowEmpty && expense !== 0) tdE.style.color = "#ff8080";
    tr.appendChild(tdE);

    const keyForRow = `${year}-${String(month).padStart(2, "0")}`;
    const explicitNoSaving =
      monthData[keyForRow] && monthData[keyForRow]._explicitNoSaving === true;

    // Toon "0" bij expliciet niets sparen / opnemen
    const savingDisplay =
      explicitNoSaving || monthSaving === 0
        ? "0"
        : formatAmount0(monthSaving);

    const tdS = document.createElement("td");
    tdS.classList.add("saving-cell");

    tdS.innerHTML = `
      <span class="saving-text">${savingDisplay}</span>
      <svg class="edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="#72ff9f">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>`;

    // kleur: 0 altijd wit, anders groen/rood
    if (savingDisplay === "0") {
      tdS.style.color = "#ffffff";
    } else {
      tdS.style.color = monthSaving > 0 ? "#72ff9f" : "#ff8080";
    }

    tdS.onclick = () => {
      const yearNum = currentYear;
      const mStr = mInfo.month.toString().padStart(2, "0");
      const key = `${yearNum}-${mStr}`;
      setCurrentMonthKey(key);

      const overlay = document.getElementById("savingOverlay");
      const form = document.getElementById("savingForm");
      const amountInput = document.getElementById("savingAmountInput");

      if (!overlay || !form || !amountInput) {
        console.error(
          "[FinFlow] savingOverlay / savingForm / savingAmountInput niet gevonden"
        );
        return;
      }

      overlay.classList.remove("hidden");
      form.classList.remove("hidden");

      // Als deze maand expliciet '0' is, altijd 0 tonen in de popup
      const md = loadMonthData();
      const entry = md[key];
      const explicitZero =
        entry && entry._explicitNoSaving === true && (!entry.savings || entry.savings.length === 0);

      let initialAmount;
      if (explicitZero) {
        initialAmount = 0;
      } else if (monthSaving != null) {
        initialAmount = Math.abs(monthSaving);
      } else {
        initialAmount = 0;
      }

      amountInput.value = initialAmount.toFixed(2).replace(".", ",");

      const depBtn = document.getElementById("savingToggleDeposit");
      const wdrBtn = document.getElementById("savingToggleWithdrawal");

      let savingType = monthSaving >= 0 ? "deposit" : "withdrawal";
      if (explicitZero) {
        savingType = "deposit";
      }

      function updateSavingToggleButtons() {
        if (!depBtn || !wdrBtn) return;
        if (savingType === "deposit") {
          depBtn.style.background = "#80ff80";
          depBtn.style.color = "#000000";
          wdrBtn.style.background = "#191b30";
          wdrBtn.style.color = "#4ba7ff";
        } else {
          wdrBtn.style.background = "#ff8080";
          wdrBtn.style.color = "#000000";
          depBtn.style.background = "#191b30";
          depBtn.style.color = "#4ba7ff";
        }
      }

      if (depBtn) {
        depBtn.onclick = () => {
          savingType = "deposit";
          updateSavingToggleButtons();
        };
      }

      if (wdrBtn) {
        wdrBtn.onclick = () => {
          savingType = "withdrawal";
          updateSavingToggleButtons();
        };
      }

      updateSavingToggleButtons();

      const saveBtn = document.getElementById("saveSavingBtn");
      const cancelBtn = document.getElementById("cancelSavingBtn");
      if (!saveBtn || !cancelBtn) {
        console.error(
          "[FinFlow] saveSavingBtn / cancelSavingBtn niet gevonden"
        );
        return;
      }

      // type altijd button; geen form-submit gedrag
      saveBtn.type = "button";
      cancelBtn.type = "button";

      // OPSLAAN
      saveBtn.onclick = () => {
        let val = amountInput.value.trim().replace(",", ".");
        let num = Number(val);

        // 0 is geldig, alleen < 0 is fout
        if (isNaN(num) || num < 0) {
          alert("Ongeldig bedrag");
          return;
        }

        let md2 = loadMonthData();
        if (!md2[key]) md2[key] = { cats: {}, savings: [] };
        if (!Array.isArray(md2[key].savings)) md2[key].savings = [];

        // altijd huidige spaaractie verwijderen
        md2[key].savings = [];

        // bedrag 0 = expliciet geen spaaractie
        if (num === 0) {
          md2[key]._explicitNoSaving = true;

          saveMonthData(md2);
          form.classList.add("hidden");
          overlay.classList.add("hidden");
          resetCaches();
          if (typeof onDataChanged === "function") onDataChanged();
          return;
        }

        // > 0 → één spaaractie opslaan
        md2[key]._explicitNoSaving = false;
        md2[key].savings.push({ type: savingType, amount: num });

        saveMonthData(md2);
        form.classList.add("hidden");
        overlay.classList.add("hidden");
        resetCaches();
        if (typeof onDataChanged === "function") onDataChanged();
      };

      // ANNULEREN
      cancelBtn.onclick = () => {
        form.classList.add("hidden");
        overlay.classList.add("hidden");
      };
    };

    tr.appendChild(tdS);

    const tdBank = document.createElement("td");
    tdBank.textContent = formatAmount0(bankEnd);
    if (!isRowEmpty && bankEnd !== 0) {
      tdBank.style.color = bankEnd > 0 ? "#72ff9f" : "#ff8080";
    }
    tr.appendChild(tdBank);

    const tdSav = document.createElement("td");
    tdSav.textContent = formatAmount0(savingEnd);
    if (!isRowEmpty && savingEnd !== 0) {
      tdSav.style.color = savingEnd > 0 ? "#72ff9f" : "#ff8080";
    }
    tr.appendChild(tdSav);

    tbody.appendChild(tr);
  }

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
    lastSaving === 0;

  const tdTotInc = document.createElement("td");
  tdTotInc.textContent = formatAmount0(totalIncome);
  tdTotInc.style.fontWeight = "700";
  if (!isYearEmpty && totalIncome !== 0)
    tdTotInc.style.color = "#72ff9f";
  totalRow.appendChild(tdTotInc);

  const tdTotExp = document.createElement("td");
  tdTotExp.textContent = formatAmount0(totalExpense);
  tdTotExp.style.fontWeight = "700";
  if (!isYearEmpty && totalExpense !== 0)
    tdTotExp.style.color = "#ff8080";
  totalRow.appendChild(tdTotExp);

  const tdTotSavFlow = document.createElement("td");
  tdTotSavFlow.textContent = formatAmount0(totalSavingFlow);
  tdTotSavFlow.style.fontWeight = "700";
  if (!isYearEmpty && totalSavingFlow !== 0)
    tdTotSavFlow.style.color =
      totalSavingFlow > 0 ? "#72ff9f" : "#ff8080";
  totalRow.appendChild(tdTotSavFlow);

  const tdTotBank = document.createElement("td");
  tdTotBank.textContent = formatAmount0(lastBank);
  tdTotBank.style.fontWeight = "700";
  if (!isYearEmpty && lastBank !== 0)
    tdTotBank.style.color =
      lastBank > 0 ? "#72ff9f" : "#ff8080";
  totalRow.appendChild(tdTotBank);

  const tdTotSav = document.createElement("td");
  tdTotSav.textContent = formatAmount0(lastSaving);
  tdTotSav.style.fontWeight = "700";
  if (!isYearEmpty && lastSaving !== 0)
    tdTotSav.style.color =
      lastSaving > 0 ? "#72ff9f" : "#ff8080";
  totalRow.appendChild(tdTotSav);

  tbody.appendChild(totalRow);

  // === Automatische overdracht naar volgend jaar (eindsaldi -> beginsaldi) ===
  const nextYear = currentYear + 1;
  if (!settings.yearStarting) settings.yearStarting = {};
  if (!settings.yearBankStarting) settings.yearBankStarting = {};

  settings.yearBankStarting[nextYear] = lastBank;
  settings.yearStarting[nextYear] = lastSaving;

  saveSettings(settings);
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
  if (v === "" && !prevIsZero) changed = true;
  else if (v !== "" && !isNaN(num) && num !== prev) changed = true;

  if (!changed) return;

  const ok = confirm(
    "Weet je zeker dat je het beginsaldo spaarrekening wilt aanpassen?"
  );
  if (!ok) {
    sInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  if (v === "" || isNaN(num)) delete settings.yearStarting[year];
  else settings.yearStarting[year] = num;

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
  if (v === "" && !prevIsZero) changed = true;
  else if (v !== "" && !isNaN(num) && num !== prev) changed = true;

  if (!changed) return;

  const ok = confirm(
    "Weet je zeker dat je het beginsaldo bankrekening wilt aanpassen?"
  );
  if (!ok) {
    bInput.value = prevIsZero ? "" : formatNumberInput(prev);
    return;
  }

  if (v === "" || isNaN(num)) delete settings.yearBankStarting[year];
  else settings.yearBankStarting[year] = num;

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
    if (v === "" || isNaN(num)) delete settings.yearMonthlySaving[year];
    else
      settings.yearMonthlySaving[year] = {
        amount: num,
        type: yearMonthlyType,
      };
  }

  saveSettings(settings);
  resetCaches();
  renderYear();
  if (typeof onDataChanged === "function") onDataChanged();
}

window.handleBankBlur = handleBankBlur;
window.handleSavingsBlur = handleSavingsBlur;
