function setupSheetEvents() {
  const newCatBtn = document.getElementById("newCat");
  if (newCatBtn) newCatBtn.type = "button";
  newCatBtn.onclick = () => openSheet(null);
  const sheetCloseBtn = document.getElementById("sheetClose");
  if (sheetCloseBtn) sheetCloseBtn.type = "button";
  sheetCloseBtn.onclick = closeSheet;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });
  sheet.addEventListener("click", (e) => e.stopPropagation());

  const addYearBtn = document.getElementById("addCatYearBtn");
  if (addYearBtn) {
    addYearBtn.type = "button";
    addYearBtn.onclick = () => {
      const rowsContainer = document.getElementById("catYearAmountsRows");
      if (!rowsContainer) return;
      const currentY = new Date().getFullYear();
      const row = document.createElement("div");
      row.className = "cat-year-row";

      const yCol = document.createElement("div");
      yCol.className = "cat-year-col-year";
      const yField = document.createElement("input");
      yField.type = "number";
      yField.className = "cat-year-input";
      yField.value = String(currentY);
      yField.min = "1900";
      yField.max = "2999";
      yCol.appendChild(yField);

      const aCol = document.createElement("div");
      aCol.className = "cat-year-col-amount";
      const aField = document.createElement("input");
      aField.className = "cat-year-amount-input";
      aField.placeholder = "Bedrag per maand";
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
    };
  }

  document.getElementById("catToggleExpense").onclick = () => {
    document.getElementById("typeInput").value = "expense";
    updateTypeButtons("expense");
  };
  document.getElementById("catToggleIncome").onclick = () => {
    document.getElementById("typeInput").value = "income";
    updateTypeButtons("income");
  };

  
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

    // Voorkom dubbele categorienamen (niet hoofdlettergevoelig).
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

    // Lees jaarbedragen uit de UI
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
      // Als er geen jaarbedragen zijn ingevuld, gebruik startjaar met 0 als basis.
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
    // Zorg dat maanddata meeverhuist als de categorienaam wijzigt
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
, oldCatName)) {
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

export function initCategoriesModule(onChange) {
  setCategoriesChangeHandler(onChange);
  setupSheetEvents();
  renderCategories();
}
