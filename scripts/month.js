// scripts/month.js
import {
  loadCats,
  loadMonthData,
  saveMonthData,
} from "./storage.js";
import {
  currentMonthKey,
  initCurrentMonthKey,
  setCurrentMonthKey,
  computeMonthTotalsFor,
  resetCaches,
} from "./state.js";

let onDataChanged = null;

export function initMonthModule(onChange) {
  onDataChanged = onChange;
  initCurrentMonthKey();
  setupMonthNavigation();
  setupSavingForm();
  renderMonth();
}

function setupMonthNavigation() {
  const prevBtn = document.getElementById("monthPrev");
  const nextBtn = document.getElementById("monthNext");
  if (prevBtn) prevBtn.addEventListener("click", () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeMonth(1));
}

function setupSavingForm() {
  const addBtn = document.getElementById("addSavingAction");
  if (addBtn) addBtn.type = "button";
  const form = document.getElementById("savingForm");
  const cancelBtn = document.getElementById("cancelSavingBtn");
  if (cancelBtn) cancelBtn.type = "button";
  const saveBtn = document.getElementById("saveSavingBtn");
  if (saveBtn) saveBtn.type = "button";

  const depBtn = document.getElementById("savingToggleDeposit");
  const wdrBtn = document.getElementById("savingToggleWithdrawal");

  let savingType = "deposit";

  function updateTypeButtons(type) {
    savingType = type;

    if (!depBtn || !wdrBtn) return;

    if (type === "deposit") {
      // Storting groen (zoals jaartab)
      depBtn.style.background = "#80ff80";
      depBtn.style.color = "#4ba7ff";
      wdrBtn.style.background = "#191b30";
      wdrBtn.style.color = "#4ba7ff";
    } else {
      // Opname rood
      wdrBtn.style.background = "#ff8080";
      wdrBtn.style.color = "#4ba7ff";
      depBtn.style.background = "#191b30";
      depBtn.style.color = "#4ba7ff";
    }
  }

  addBtn.onclick = () => {
    form.classList.remove("hidden");
    document.getElementById("savingAmountInput").value = "";
    updateTypeButtons("deposit");
  };

  cancelBtn.onclick = () => {
    form.classList.add("hidden");
  };

  depBtn.onclick = () => updateTypeButtons("deposit");
  wdrBtn.onclick = () => updateTypeButtons("withdrawal");

  saveBtn.onclick = () => {
    const amountInput = document.getElementById("savingAmountInput");
    let val = amountInput.value.trim();
    if (!val) {
      alert("Bedrag verplicht");
      return;
    }
    let num = Number(val.replace(",", "."));
    if (isNaN(num) || num === 0) {
      alert("Ongeldig bedrag");
      return;
    }

    const md = loadMonthData();
    const key = currentMonthKey;
    if (!md[key]) md[key] = { cats: {}, savings: [] };
    if (!Array.isArray(md[key].savings)) md[key].savings = [];

    md[key].savings.push({
      type: savingType,
      amount: num,
    });

    saveMonthData(md);
    form.classList.add("hidden");
    resetCaches();
    renderMonth();
    if (typeof onDataChanged === "function") onDataChanged();
  };

  updateTypeButtons("deposit");
}

export function renderMonth() {
  const cats = loadCats();
  const md = loadMonthData();

  initCurrentMonthKey();
  const key = currentMonthKey;
  const year = parseInt(key.split("-")[0], 10);
  const monthNum = parseInt(key.split("-")[1], 10);

  const entry = md[key] || { cats: {}, savings: [] };
  md[key] = entry;

  const container = document.getElementById("monthCategories");
  if (!container) return;
  container.innerHTML = "";

  // Render categorieën met euro en 2 decimalen
  cats.forEach((c) => {
    const cName = c.name;

let stored;

// 1. Eerst: maand-override (als gebruiker in Maandtab iets aanpast)
if (entry.cats && Object.prototype.hasOwnProperty.call(entry.cats, cName)) {
  stored = entry.cats[cName];
}
// 2. Anders: het jaarbedrag uit de categorie-tab voor het huidige jaar
else if (c.amountsByYear && c.amountsByYear[String(year)]) {
  stored = c.amountsByYear[String(year)];
}
// 3. Anders: geen bedrag
else {
  stored = "";
}

const yearOfMonth = year;
const include = !c.startYear || yearOfMonth >= c.startYear;

let displayVal = "";
if (stored !== null && stored !== undefined && String(stored).trim() !== "") {
  let num = Number(String(stored).replace(",", "."));
  if (!isNaN(num)) {
    displayVal = num.toFixed(2).replace(".", ",");
  }
}

    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const left = document.createElement("div");
    left.className = "card-left";

    const tag = document.createElement("div");
    tag.className = "label " + (c.type === "income" ? "income" : "expense");
    tag.textContent = c.type === "income" ? "INKOMEN" : "UITGAVE";
    left.appendChild(tag);

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = c.name;
    left.appendChild(title);

    header.appendChild(left);

    const right = document.createElement("div");
    right.style.textAlign = "right";
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "6px";

    const euroSpan = document.createElement("span");
    euroSpan.textContent = "€";
    euroSpan.style.fontSize = "13px";
    euroSpan.style.color = "#a4a7c4";
    right.appendChild(euroSpan);

    const inp = document.createElement("input");
    inp.className = "inline-input";
    inp.value = displayVal;
    inp.onchange = () => {
      const raw = inp.value.trim();
      let n = Number(raw.replace(",", "."));
      if (isNaN(n)) n = 0;
      const norm = n.toFixed(2);
      if (!entry.cats) entry.cats = {};
      entry.cats[cName] = norm;
      const mdata = loadMonthData();
      mdata[key] = entry;
      saveMonthData(mdata);
      resetCaches();
      renderMonth();
      if (typeof onDataChanged === "function") onDataChanged();
    };
    right.appendChild(inp);

    header.appendChild(right);
    card.appendChild(header);

    if (!include) {
      const msg = document.createElement("div");
      msg.style.fontSize = "11px";
      msg.style.color = "#7e81a3";
      msg.textContent = `Geen bedrag ingesteld voor dit jaar (${year})`;
      card.appendChild(msg);
    }

    container.appendChild(card);
  });

  // Samenvatting met spaaracties erin
  const totals = computeMonthTotalsFor(year, monthNum);
  const income = totals.income;
  const expense = totals.expense;
  const available = totals.available;

  const sumIncome = document.getElementById("sumIncome");
  const sumExpense = document.getElementById("sumExpense");
  const sumAvailable = document.getElementById("sumAvailable");
  if (sumIncome) sumIncome.textContent = "€ " + income.toFixed(2).replace(".", ",");
  if (sumExpense) sumExpense.textContent = "€ " + expense.toFixed(2).replace(".", ",");
  if (sumAvailable) sumAvailable.textContent = "€ " + available.toFixed(2).replace(".", ",");

  // Maandtitel
  const d2 = new Date(year, monthNum - 1, 1);
  const title = document.getElementById("monthTitle");
  if (title) {
    const months = [
      "januari","februari","maart","april","mei","juni",
      "juli","augustus","september","oktober","november","december"
    ];
    title.textContent = `${months[d2.getMonth()]} ${d2.getFullYear()}`;
  }

  renderSavingsList(entry);
}


function renderSavingsList(entry) {
  const listDiv = document.getElementById("savingsList");
  if (!listDiv) return;

  listDiv.innerHTML = "";

  const arr = entry.savings || [];

  if (arr.length === 0) {
    const p = document.createElement("p");
    p.style.color = "#a4a7c4";
    p.style.fontSize = "14px";
    p.textContent = "Nog geen spaaracties voor deze maand.";
    listDiv.appendChild(p);
    return;
  }

  arr.forEach((a, idx) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

    const label = document.createElement("div");
    label.style.display = "flex";
    label.style.gap = "4px";
    label.style.fontSize = "14px";

    const typeSpan = document.createElement("span");
    typeSpan.textContent = a.type === "deposit" ? "Storting:" : "Opname:";
    typeSpan.style.color = "#f5f7ff";

    const amountSpan = document.createElement("span");
    amountSpan.textContent = "€ " + Number(a.amount).toFixed(2).replace(".", ",");
    amountSpan.style.color = a.type === "deposit" ? "#72ff9f" : "#ff8080";

    label.appendChild(typeSpan);
    label.appendChild(amountSpan);
    row.appendChild(label);

    const delBtn = (()=>{let b=document.createElement("button"); b.type="button"; return b;})();
    delBtn.type = "button";
    delBtn.textContent = "Verwijderen";
    delBtn.className = "small-btn danger saving-delete-btn";

    delBtn.onclick = () => {
      const isDeposit = a.type === "deposit";
      const msg = isDeposit ? "Storting verwijderen?" : "Opname verwijderen?";
      if (!confirm(msg)) return;

      const md = loadMonthData();
      const key = currentMonthKey;
      const e = md[key];
      if (!e || !Array.isArray(e.savings)) return;

      e.savings.splice(idx, 1);
      md[key] = e;
      saveMonthData(md);

      resetCaches();
      renderMonth();
      if (typeof onDataChanged === "function") onDataChanged();
    };

    row.appendChild(delBtn);
    listDiv.appendChild(row);
  });
}


function changeMonth(offset) {
  initCurrentMonthKey();
  const parts = currentMonthKey.split("-");
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);

  m += offset;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  if (m < 10) m = "0" + m;
  setCurrentMonthKey(`${y}-${m}`);

  resetCaches();
  renderMonth();
  if (typeof onDataChanged === "function") onDataChanged();
}
