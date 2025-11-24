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
    let num = parseFloat((c.amount ?? "").toString().replace(",", "."));
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

function openSheet(index) {
  const cats = loadCats();
  editIndex = index ?? null;
  const c =
    editIndex !== null && cats[editIndex]
      ? cats[editIndex]
      : { name: "", amount: "", type: "expense" };

  document.getElementById("sheetTitle").textContent =
    editIndex === null ? "Nieuwe categorie" : "Categorie bewerken";
  document.getElementById("nameInput").value = c.name || "";
  document.getElementById("amountInput").value = c.amount
    ? (Number(c.amount).toFixed(2).replace(".", ","))
    : "";
  document.getElementById("typeInput").value = c.type || "expense";

  const currentY = new Date().getFullYear();
  const yInput = document.getElementById("catStartYear");
  yInput.value =
    typeof c.startYear === "number" && !isNaN(c.startYear)
      ? c.startYear
      : currentY;

  updateTypeButtons(c.type);

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
  if (newCatBtn) newCatBtn.type = "button";
  newCatBtn.onclick = () => openSheet(null);
  const sheetCloseBtn = document.getElementById("sheetClose");
  if (sheetCloseBtn) sheetCloseBtn.type = "button";
  sheetCloseBtn.onclick = closeSheet;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });
  sheet.addEventListener("click", (e) => e.stopPropagation());

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
    const amtRaw = document.getElementById("amountInput").value.trim();
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

    let num = Number(amtRaw.replace(",", "."));
    if (isNaN(num)) num = 0;
    const normalized = num.toFixed(2);

    const cats = loadCats();
    const newCat = { name, amount: normalized, type, startYear: startY };

    if (editIndex !== null && cats[editIndex]) {
      cats[editIndex] = newCat;
    } else {
      cats.push(newCat);
    }

    saveCats(cats);
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
