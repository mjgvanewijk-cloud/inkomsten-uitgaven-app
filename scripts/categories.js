// scripts/categories.js
import { loadCats, saveCats, loadMonthData, saveMonthData } from "./storage.js";
import { resetCaches } from "./state.js";

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

  if (!Array.isArray(cats) || cats.length === 0) {
    const p = document.createElement("p");
    p.textContent =
      "Nog geen categorieën. Voeg als eerste je vaste inkomens- en uitgavencategorieën toe.";
    p.style.opacity = "0.7";
    list.appendChild(p);
    return;
  }

  cats.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "cat-card";

    const header = document.createElement("div");
    header.className = "cat-card-header";

    const left = document.createElement("div");
    left.className = "left";

    const nameEl = document.createElement("div");
    nameEl.className = "cat-name";
    nameEl.textContent = c.name || "(naamloos)";
    left.appendChild(nameEl);

    const startEl = document.createElement("div");
    startEl.className = "cat-start";
    if (c.startYear) {
      startEl.textContent = "Vanaf " + c.startYear;
    } else {
      startEl.textContent = "Vanaf eerste jaar";
    }
    left.appendChild(startEl);

    header.appendChild(left);

    const right = document.createElement("div");
    right.className = "right";

    const amt = document.createElement("div");
    amt.className = "cat-amount";
    let currentYear = new Date().getFullYear();
    let rawVal = null;
    if (c.amountsByYear && typeof c.amountsByYear === "object") {
      const years = Object.keys(c.amountsByYear)
        .map((y) => parseInt(y, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);
      let chosen = null;
      for (const y of years) {
        if (y <= currentYear) chosen = y;
      }
      if (chosen === null && years.length > 0) {
        chosen = years[0];
      }
      if (chosen !== null) {
        rawVal = c.amountsByYear[String(chosen)];
      }
    }
    if (rawVal == null) {
      amt.textContent = "€ 0,00";
    } else {
      let num = parseFloat(rawVal.toString().replace(",", "."));
      if (isNaN(num)) num = 0;
      amt.textContent = "€ " + num.toFixed(2).replace(".", ",");
    }
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

    const editBtn = (() => {
      let b = document.createElement("button");
      b.type = "button";
      return b;
    })();
    editBtn.type = "button";
    editBtn.className = "small-btn";
    editBtn.textContent = "Bewerken";
    editBtn.onclick = () => openSheet(idx);
    row.appendChild(editBtn);

    const delBtn = (() => {
      let b = document.createElement("button");
      b.type = "button";
      return b;
    })();
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

function createYearRow(rowsContainer, year, rawAmount) {
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
  aField.placeholder = "Bedrag";
  if (rawAmount != null && rawAmount !== "") {
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
    rowsContainer.removeChild(row);
  };
  delCol.appendChild(delBtn);

  row._yearInput = yField;
  row._amountInput = aField;

  row.appendChild(yCol);
  row.appendChild(aCol);
  row.appendChild(delCol);

  rowsContainer.appendChild(row);
}

function openSheet(index) {
  const cats = loadCats();
  editIndex = index ?? null;
  const currentY = new Date().getFullYear();

  const base =
    editIndex !== null && cats[editIndex]
      ? cats[editIndex]
      : {
          name: "",
          type: "expense",
          startYear: currentY,
          amountsByYear: { [String(currentY)]: "0.00" },
        };

  const titleEl = document.getElementById("sheetTitle");
  if (titleEl) {
    titleEl.textContent =
      editIndex === null ? "Nieuwe categorie" : "Categorie bewerken";
  }

  const nameInput = document.getElementById("nameInput");
  if (!nameInput) {
    console.error("nameInput niet gevonden in DOM");
    return;
  }
  nameInput.value = base.name || "";

  const typeInput = document.getElementById("typeInput");
  if (typeInput) {
    typeInput.value = base.type || "expense";
  }

  const yInput = document.getElementById("catStartYear");
  const currentYVal =
    typeof base.startYear === "number" && !isNaN(base.startYear)
      ? base.startYear
      : currentY;
  if (yInput) {
    yInput.value = currentYVal;
  }

  // --- Automatisch jaarregel syncen + hint updaten (alleen bij nieuwe categorie) ---
  if (editIndex === null && yInput) {
    yInput.addEventListener(
      "blur",
      () => {
        const newStart = parseInt(yInput.value, 10);
        if (isNaN(newStart)) return;

        const rowsContainer = document.getElementById("catYearAmountsRows");
        if (!rowsContainer) return;

        const startHintEl = document.getElementById("catStartYearHint");
        if (startHintEl) {
          startHintEl.textContent =
            "Deze categorie telt mee vanaf " +
            newStart +
            ". In eerdere jaren wordt hij niet automatisch meegenomen.";
        }

        const rows = rowsContainer.getElementsByClassName("cat-year-row");

        if (rows.length === 0) {
          createYearRow(rowsContainer, newStart, "0.00");
        }
      },
      { once: true }
    );
  }

  // Jaarregels initialiseren op basis van base.amountsByYear
  const rowsContainer = document.getElementById("catYearAmountsRows");
  if (rowsContainer) {
    rowsContainer.innerHTML = "";
    // ✅ Fix: alleen de "object"-tak pakken als er ook echt entries zijn
    if (
      base.amountsByYear &&
      typeof base.amountsByYear === "object" &&
      Object.keys(base.amountsByYear).length > 0
    ) {
      const years = Object.keys(base.amountsByYear)
        .map((k) => parseInt(k, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      years.forEach((y) => {
        createYearRow(rowsContainer, y, base.amountsByYear[String(y)]);
      });
    } else {
      // Voor nieuwe categorieën of lege amountsByYear altijd minimaal één rij
      createYearRow(rowsContainer, currentYVal, "0.00");
    }
  }

  const helpEl = document.getElementById("catYearHelp");
  if (helpEl) {
    helpEl.textContent =
      "Je kunt per jaar een ander standaard maandbedrag invullen. Latere jaren zonder waarde blijven gelijk aan het laatste ingevulde jaar.";
  }

  updateTypeButtons(base.type);

  if (!overlay || !sheet) {
    alert(
      "Categorie-sheet ontbreekt in index.html (sheetOverlay / sheetForm). De rest van de app blijft werken, maar deze sheet niet."
    );
    console.error(
      "[FinFlow] openSheet() aangeroepen, maar sheetOverlay/sheetForm ontbreken in de DOM."
    );
    return;
  }

  overlay.style.display = "flex";
  setTimeout(() => sheet.classList.add("show"), 10);
}

function closeSheet() {
  if (!overlay || !sheet) return;
  sheet.classList.remove("show");
  setTimeout(() => (overlay.style.display = "none"), 250);
  editIndex = null;
}

function setupSheetEvents() {
  // --- Nieuwe categorie toevoegen ---
  const newCatBtn = document.getElementById("newCat");
  if (newCatBtn) {
    newCatBtn.type = "button";
    newCatBtn.onclick = () => {
      console.log(
        "[FinFlow] Klik op 'Nieuwe categorie toevoegen' → openSheet(null)"
      );
      openSheet(null);
    };
  } else {
    console.warn("[FinFlow] Knop met id 'newCat' niet gevonden in DOM");
  }

  // --- Sheet sluiten ---
  const sheetCloseBtn = document.getElementById("sheetClose");
  if (sheetCloseBtn) {
    sheetCloseBtn.type = "button";
    sheetCloseBtn.onclick = closeSheet;
  }

  // Klikken buiten het sheet → sluiten
  if (overlay && sheet) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSheet();
    });
    sheet.addEventListener("click", (e) => e.stopPropagation());
  }

  // --- Jaar toevoegen-knop ---
  const addYearBtn = document.getElementById("addCatYearBtn");
  if (addYearBtn) {
    addYearBtn.type = "button";
    addYearBtn.textContent = "+ Nieuw jaar toevoegen";
    addYearBtn.onclick = () => {
      const rowsContainer = document.getElementById("catYearAmountsRows");
      if (!rowsContainer) return;

      const rows = Array.from(
        rowsContainer.getElementsByClassName("cat-year-row")
      );
      const years = rows
        .map((r) => parseInt(r._yearInput.value, 10))
        .filter((y) => !Number.isNaN(y))
        .sort((a, b) => a - b);

      let newYear;
      if (years.length === 0) {
        const startY = parseInt(
          document.getElementById("catStartYear").value,
          10
        );
        newYear = startY;
      } else {
        newYear = years[years.length - 1] + 1;
      }

      createYearRow(rowsContainer, newYear, "");
    };
  }

  // --- Type toggles ---
  const expenseToggle = document.getElementById("catToggleExpense");
  if (expenseToggle) {
    expenseToggle.onclick = () => {
      const typeInput = document.getElementById("typeInput");
      if (typeInput) typeInput.value = "expense";
      updateTypeButtons("expense");
    };
  }

  const incomeToggle = document.getElementById("catToggleIncome");
  if (incomeToggle) {
    incomeToggle.onclick = () => {
      const typeInput = document.getElementById("typeInput");
      if (typeInput) typeInput.value = "income";
      updateTypeButtons("income");
    };
  }

  // --- Opslaan-knop ---
  const sheetSaveBtn = document.getElementById("sheetSave");
  if (sheetSaveBtn) {
    sheetSaveBtn.type = "button";
    sheetSaveBtn.onclick = () => {
      const nameEl = document.getElementById("nameInput");
      const typeEl = document.getElementById("typeInput");
      const yInput = document.getElementById("catStartYear");

      const name = nameEl ? nameEl.value.trim() : "";
      const type = typeEl ? typeEl.value : "expense";

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
        alert(
          "Er bestaat al een categorie met deze naam. Kies een andere naam."
        );
        return;
      }

      const rowsContainer = document.getElementById("catYearAmountsRows");
      const rows = rowsContainer
        ? Array.from(rowsContainer.getElementsByClassName("cat-year-row"))
        : [];
      const amountsByYear = {};
      for (const row of rows) {
        const yField = row._yearInput;
        const aField = row._amountInput;
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

      const oldCatName =
        editIndex !== null && cats[editIndex] ? cats[editIndex].name : null;

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
          if (
            entry &&
            entry.cats &&
            Object.prototype.hasOwnProperty.call(entry.cats, oldCatName)
          ) {
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
}

export function initCategoriesModule() {
  setupSheetEvents();
}
