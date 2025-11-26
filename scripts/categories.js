// scripts/categories.js
import { loadCats, saveCats, loadMonthData, saveMonthData } from "./storage.js";
import { resetCaches, currentYear } from "./state.js";

let editIndex = null;
let onDataChanged = null;

export function setCategoriesChangeHandler(handler) {
  onDataChanged = handler;
}

export function renderCategories() {
  const cats = loadCats();
  const list = document.getElementById("catList");
  if (!list) return;

  list.innerHTML = "";

  if (cats.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "13px";
    empty.style.color = "#a4a7c4";
    empty.textContent = "Nog geen categorieën. Voeg er één toe.";
    list.appendChild(empty);
    return;
  }

  cats.forEach((c, idx) => {
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

    const amt = document.createElement("div");
    amt.className = "card-amount";
    let rawVal = "";
    if (c.amountsByYear && typeof c.amountsByYear === "object") {
      const years = Object.keys(c.amountsByYear)
        .map((k) => parseInt(k, 10))
        .filter((y) => !Number.isNaN(y))
        .sort((a, b) => a - b);
      if (years.length > 0) {
        let chosen = null;
        for (const y of years) {
          if (y <= currentYear) chosen = y;
        }
        if (chosen === null) chosen = years[0];
        rawVal = c.amountsByYear[String(chosen)];
      }
    } else {
      rawVal = c.amount ?? "";
    }
    let num = parseFloat((rawVal ?? "").toString().replace(",", "."));
    if (isNaN(num)) num = 0;
    amt.textContent = "€ " + num.toFixed(2).replace(".", ",");
    right.appendChild(amt);

    const t = document.createElement("div");
    t.className = "card-type";
    t.textContent =
      c.type === "income"
        ? "Maandelijkse inkomenscategorie"
        : "Maandelijkse uitgavencategorie";
    right.appendChild(t);

    header.appendChild(right);
    card.appendChild(header);

    const row = document.createElement("div");
    row.className = "btn-row";

    const editBtn = (()=>{let b=document.createElement("button"); b.type="button"; return b;})();
    editBtn.type = "button";
    editBtn.className = "small-btn";
    editBtn.textContent = "Bewerken";
    editBtn.onclick = () => openSheet(idx);
    row.appendChild(editBtn);

    const delBtn = (()=>{let b=document.createElement("button"); b.type="button"; return b;})();
    delBtn.type = "button";
    delBtn.className = "small-btn danger";
    delBtn.textContent = "Verwijderen";
    delBtn.onclick = () => deleteCategory(idx);
    row.appendChild(delBtn);

    card.appendChild(row);
    list.appendChild(card);
  });
}

function deleteCategory(index) {
  const cats = loadCats();
  const c = cats[index];
  if (!c) return;

  if (!confirm(`Categorie "${c.name}" verwijderen?`)) return;

  cats.splice(index, 1);
  saveCats(cats);

  const md = loadMonthData();
  for (const key in md) {
    if (!Object.prototype.hasOwnProperty.call(md, key)) continue;
    const obj = md[key];

    if (obj.cats && Object.prototype.hasOwnProperty.call(obj.cats, c.name)) {
      delete obj.cats[c.name];
    }

    if (obj.savings && Array.isArray(obj.savings)) {
      obj.savings = obj.savings.filter((sav) => sav.categoryName !== c.name);
    }
  }
  saveMonthData(md);
  resetCaches();
  renderCategories();
  if (typeof onDataChanged === "function") onDataChanged();
}

// === Sheet logica ===

const overlay = document.getElementById("sheetOverlay");
const sheet = document.getElementById("sheetForm");

function updateTypeButtons(type) {
  const expBtn = document.getElementById("catToggleExpense");
  const incBtn = document.getElementById("catToggleIncome");
  if (!expBtn || !incBtn) return;

  if (type === "income") {
    // Income groen
    incBtn.style.background = "#1b3b20";
    incBtn.style.color = "#72ff9f";
    expBtn.style.background = "#191b30";
    expBtn.style.color = "#4ba7ff";
  } else {
    // Expense rood
    expBtn.style.background = "#3b1b1b";
    expBtn.style.color = "#ff8080";
    incBtn.style.background = "#191b30";
    incBtn.style.color = "#4ba7ff";
  }
}

function createYearRow(container, year, rawAmount) {
  const row = document.createElement("div");
  row.className = "cat-year-row";

  const yCol = document.createElement("div");
  yCol.className = "cat-year-col-year";
  const yField = document.createElement("input");
  yField.type = "number";
  yField.className = "cat-year-input";
  yField.value = String(year);
  yField.min = "1900";
  yField.max = "2999";
  yCol.appendChild(yField);

  const aCol = document.createElement("div");
  aCol.className = "cat-year-col-amount";
  const aField = document.createElement("input");
  aField.className = "cat-year-amount-input";
  aField.placeholder = "Bedrag per maand";
  if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
    const num = Number(rawAmount.toString().replace(",", "."));
    if (!Number.isNaN(num)) {
      aField.value = num.toFixed(2).replace(".", ",");
    } else {
      aField.value = rawAmount;
    }
  }
  aCol.appendChild(aField);

  const delCol = document.createElement("div");
  delCol.className = "cat-year-col-actions";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "small-btn danger";
  delBtn.textContent = "Verwijder jaar";
  delBtn.onclick = () => {
    container.removeChild(row);
  };
  delCol.appendChild(delBtn);

  row.appendChild(yCol);
  row.appendChild(aCol);
  row.appendChild(delCol);

  container.appendChild(row);
}

function openSheet(index) {
  const cats = loadCats();
  editIndex = index ?? null;
  const base =
    editIndex !== null && cats[editIndex]
      ? cats[editIndex]
      : { name: "", type: "expense", startYear: undefined, amountsByYear: {} };

  const currentY = new Date().getFullYear();

  document.getElementById("sheetTitle").textContent =
    editIndex === null ? "Nieuwe categorie" : "Categorie bewerken";
  document.getElementById("nameInput").value = base.name || "";
  document.getElementById("typeInput").value = base.type || "expense";

  const yInput = document.getElementById("catStartYear");
  const startY =
    typeof base.startYear === "number" && !isNaN(base.startYear)
      ? base.startYear
      : currentY;
  yInput.value = startY;

  const startHint = document.getElementById("catStartYearHint");
  if (startHint) {
    startHint.textContent =
      "Deze categorie telt mee vanaf " +
      startY +
      ". In eerdere jaren wordt hij niet automatisch meegenomen.";
  }

  const rowsContainer = document.getElementById("catYearAmountsRows");
  if (rowsContainer) {
    rowsContainer.innerHTML = "";
    const src = base.amountsByYear && typeof base.amountsByYear === "object"
      ? base.amountsByYear
      : {};
    const years = Object.keys(src)
      .map((k) => parseInt(k, 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => a - b);

    if (years.length === 0) {
      createYearRow(rowsContainer, startY, "");
    } else {
      years.forEach((y) => {
        createYearRow(rowsContainer, y, src[String(y)]);
      });
    }
  }

  const yearHelp = document.getElementById("catYearHelp");
  if (yearHelp) {
    yearHelp.textContent =
      "Stel per jaar het standaard maandbedrag in. Je kunt bedragen later per maand aanpassen in de Maand-tab.";
  }

  updateTypeButtons(base.type || "expense");

  overlay.style.display = "block";
  setTimeout(() => sheet.classList.add("show"), 10);
}

function closeSheet() {
  sheet.classList.remove("show");
  setTimeout(() => (overlay.style.display = "none"), 250);
  editIndex = null;
}

function setupSheetEvents() {
  const newCatBtn = document.getElementById("newCat");
  if (newCatBtn) {
    newCatBtn.type = "button";
    newCatBtn.onclick = () => openSheet(null);
  }

  const sheetCloseBtn = document.getElementById("sheetClose");
  if (sheetCloseBtn) {
    sheetCloseBtn.type = "button";
    sheetCloseBtn.onclick = closeSheet;
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });
  sheet.addEventListener("click", (e) => e.stopPropagation());

  const expBtn = document.getElementById("catToggleExpense");
  const incBtn = document.getElementById("catToggleIncome");
  if (expBtn) {
    expBtn.onclick = () => {
      document.getElementById("typeInput").value = "expense";
      updateTypeButtons("expense");
    };
  }
  if (incBtn) {
    incBtn.onclick = () => {
      document.getElementById("typeInput").value = "income";
      updateTypeButtons("income");
    };
  }

  const addYearBtn = document.getElementById("addCatYearBtn");
  if (addYearBtn) {
    addYearBtn.type = "button";
    addYearBtn.onclick = () => {
      const rowsContainer = document.getElementById("catYearAmountsRows");
      if (!rowsContainer) return;
      const currentY = new Date().getFullYear();
      createYearRow(rowsContainer, currentY, "");
    };
  }

  const sheetSaveBtn = document.getElementById("sheetSave");
  if (sheetSaveBtn) sheetSaveBtn.type = "button";
  sheetSaveBtn.onclick = () => {
    const name = document.getElementById("nameInput").value.trim();
    const type = document.getElementById("typeInput").value;
    const yInput = document.getElementById("catStartYear");
    const currentY = new Date().getFullYear();
    let startY =
      yInput && yInput.value.trim() !== ""
        ? parseInt(yInput.value, 10)
        : currentY;
    if (isNaN(startY)) startY = currentY;

    if (!name) {
      alert("Naam verplicht");
      return;
    }

    const cats = loadCats();
    const lowerName = name.toLowerCase();
    const hasDuplicate = cats.some((c, idx) => {
      const existing = (c.name || "").trim().toLowerCase();
      return existing === lowerName && idx !== editIndex;
    });
    if (hasDuplicate) {
      alert("Er bestaat al een categorie met deze naam. Kies een andere naam.");
      return;
    }

    const rowsContainer = document.getElementById("catYearAmountsRows");
    const rows = rowsContainer
      ? Array.from(rowsContainer.getElementsByClassName("cat-year-row"))
      : [];
    const amountsByYear = {};

    for (const row of rows) {
      const yField = row.querySelector(".cat-year-input");
      const aField = row.querySelector(".cat-year-amount-input");
      if (!yField || !aField) continue;

      const yStr = (yField.value || "").trim();
      if (!yStr) continue;
      const yNum = parseInt(yStr, 10);
      if (Number.isNaN(yNum) || yNum < 1900 || yNum > 2999) continue;

      let raw = (aField.value || "").trim();
      if (!raw) continue;
      let num = Number(raw.replace(",", "."));
      if (Number.isNaN(num)) num = 0;
      const normalized = num.toFixed(2);

      amountsByYear[String(yNum)] = normalized;
    }

    if (Object.keys(amountsByYear).length === 0) {
      amountsByYear[String(startY)] = "0.00";
    }

    const oldCatName = (editIndex !== null && cats[editIndex])
      ? cats[editIndex].name
      : null;

    const newCat = {
      name,
      type,
      startYear: startY,
      amountsByYear,
    };

    if (editIndex !== null && cats[editIndex]) {
      cats[editIndex] = newCat;
    } else {
      cats.push(newCat);
    }

    saveCats(cats);

    if (editIndex !== null && oldCatName && oldCatName !== name) {
      const md = loadMonthData();
      let changed = false;
      for (const key in md) {
        const entry = md[key];
        if (entry && entry.cats && Object.prototype.hasOwnProperty.call(entry.cats, oldCatName)) {
          const val = entry.cats[oldCatName];
          if (!Object.prototype.hasOwnProperty.call(entry.cats, name)) {
            entry.cats[name] = val;
          }
          delete entry.cats[oldCatName];
          changed = true;
        }
      }
      if (changed) saveMonthData(md);
    }

    closeSheet();
    renderCategories();
    resetCaches();
    if (typeof onDataChanged === "function") onDataChanged();
  };
}


export function initCategoriesModule

export function initCategoriesModule(onChange) {
  setCategoriesChangeHandler(onChange);
  setupSheetEvents();
  renderCategories();
}
