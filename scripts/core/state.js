// scripts/state.js
// Centrale rekenmotor voor jaaroverzicht, potjes en beginsaldi.

import { loadCats, loadMonthData, loadSettings, saveSettings } from "../core/storage.js";

export let currentMonthKey = null;
export let currentYear = new Date().getFullYear();

// Cache voor jaar-simulaties
let yearCache = {};

// ---------------------------------------------------------
// Basis helpers
// ---------------------------------------------------------

export function resetCaches() {
// --- SAFETY FIX: startMonth altijd valideren ---
let settings = loadSettings();
if (!settings.startMonth || typeof settings.startMonth !== "object") {
    settings.startMonth = {};
}

// Alleen bestaande startMonth entries valideren, geen nieuwe jaren aanmaken
for (const yStr of Object.keys(settings.startMonth)) {
    const sm = settings.startMonth[yStr];
    if (typeof sm !== "number" || sm < 1 || sm > 12) {
        delete settings.startMonth[yStr];
    }
}

// Cruciale regels die ontbraken/fout stonden:
saveSettings(settings);
yearCache = {};
}

function invalidateFutureCaches(startYear) {
  for (const y of Object.keys(yearCache)) {
    const yNum = Number(y);
    if (yNum >= startYear) {
      delete yearCache[yNum];
    }
  }
}

// ---------------------------------------------------------
// NIEUWE HELPER: Berekent de banksaldo startwaarde voor een jaar
// ---------------------------------------------------------

export function getStartingBankBalance(year) {
  // 1. Controleer expliciete gebruikersinstelling (via handleBankBlur in year.js)
  const settings = loadSettings(); 
  if (
    settings.yearBankStarting &&
    typeof settings.yearBankStarting[year] === 'number'
  ) {
    return settings.yearBankStarting[year];
  }

    // 2. Terugval naar berekende eindsaldo van het vorige jaar
  const prevYear = year - 1;
  if (prevYear >= 1900) {
    
    // De cache van ALLE jaren V.A. het VORIGE JAAR wissen.
    // Dit garandeert dat de berekening van prevYear (bijv. 2024) opnieuw wordt uitgevoerd.
    invalidateFutureCaches(year); // <<-- WIJZIGING: Gebruik prevYear i.p.v. year
   
    // Roep computeYearEndState aan, wat nu gegarandeerd een nieuwe simulatie voor het vorige jaar start.
    const prevSim = computeYearEndState(prevYear);
    return prevSim.bankEnd;
  }
  
  // 3. Standaardwaarde
  return 0;
}

// ... (Rest van state.js, inclusief simulateYear, staat hieronder)

export function initCurrentMonthKey() {
  if (!currentMonthKey) {
    const d = new Date();
    const y = d.getFullYear();
    let m = d.getMonth() + 1;
    if (m < 10) m = "0" + m;
    currentMonthKey = `${y}-${m}`;
  }
}

export function setCurrentMonthKey(key) {
  currentMonthKey = key;
}

export function setCurrentYear(y) {
  currentYear = y;
}

export function monthName(m) {
  const arr = [
    "jan",
    "feb",
    "mrt",
    "apr",
    "mei",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ];
  return arr[m - 1] || `m${m}`;
}

// ---------------------------------------------------------
// Settings-shape veilig maken (incl. potjes + kredietlimiet)
// ---------------------------------------------------------

function ensureSettings() {
  const settings = loadSettings() || {};

  if (!settings.yearStarting || typeof settings.yearStarting !== "object") {
    settings.yearStarting = {};
  }
  if (!settings.yearBankStarting || typeof settings.yearBankStarting !== "object") {
    settings.yearBankStarting = {};
  }
  if (!settings.yearMonthlySaving || typeof settings.yearMonthlySaving !== "object") {
    settings.yearMonthlySaving = {};
  }

  // Wizard-inkomen/uitgaven per jaar (alleen voor simulatie)
  if (!settings.yearWizardIncome || typeof settings.yearWizardIncome !== "object") {
    settings.yearWizardIncome = {};
  }
  if (!settings.yearWizardExpense || typeof settings.yearWizardExpense !== "object") {
    settings.yearWizardExpense = {};
  }

  // Potjes-structuur: doorlopende rekeningen
  if (!settings.pots || typeof settings.pots !== "object") {
    // vorm: { potId: { name: "Vakantie", startBalance: 300 } }
    settings.pots = {};
  }

  if (!settings.startMonth || typeof settings.startMonth !== "object") {
    settings.startMonth = {};
  }

  // Minimum banksaldo (waarschuwing)
  if (typeof settings.minBankBalance !== "number") {
    settings.minBankBalance = 0;
  }

  // Premium-structuur
  if (!settings.premium || typeof settings.premium !== "object") {
    settings.premium = {
      active: false,
      trialStart: null,
      trialUsed: false,
    };
  } else {
    if (typeof settings.premium.active !== "boolean") {
      settings.premium.active = !!settings.premium.active;
    }
    if (typeof settings.premium.trialStart !== "string") {
      settings.premium.trialStart = settings.premium.trialStart || null;
    }
    if (typeof settings.premium.trialUsed !== "boolean") {
      settings.premium.trialUsed = !!settings.premium.trialUsed;
    }
  }

  // Eerste categorie-vraag (splits-popup) standaard op niet-gesteld
  if (typeof settings.splitFirstQuestionDone !== "boolean") {
    settings.splitFirstQuestionDone = false;
  }

  return settings;
}
// ---------------------------------------------------------
// Categoriebedragen per jaar
// ---------------------------------------------------------

// Bepaal het standaard maandbedrag van een categorie voor een gegeven jaar.
// Gebruikt amountsByYear indien aanwezig; valt terug op c.amount als er niets bekend is.
export function getCategoryAmountForYear(c, year) {
  if (c && c.amountsByYear && typeof c.amountsByYear === "object") {
    const years = Object.keys(c.amountsByYear)
      .map((k) => parseInt(k, 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => a - b);

    // Neem de dichtstbijzijnde waarde <= huidige year
    let chosen = null;
    for (const y of years) {
      if (y <= year) {
        chosen = c.amountsByYear[y];
      } else {
        break;
      }
    }
    if (chosen != null) return chosen;
  }
  return c && c.amount != null ? c.amount : "";
}

// ---------------------------------------------------------
// Maandtotalen (zonder potjes)
// ---------------------------------------------------------

// Per maand: totalen inclusief spaaracties van deze maand
export function computeMonthTotalsFor(year, month) {
  const key = `${year}-${month < 10 ? "0" + month : month}`;
const monthData = loadMonthData();
  const entry = monthData[key] || { cats: {}, savings: [] };

  let income = 0;
  let expense = 0;
  let deposits = 0;
  let withdrawals = 0;

  // Categorie-gebaseerde bedragen: alleen echte verdelingen uit deze maand (entry.cats)
  // Categorie-defaults uit het categoriebeheer worden NIET direct meegerekend in de simulatie,
  // maar dienen alleen als voorgestelde verdeling in de splits-popup.
  if (entry.cats && typeof entry.cats === "object") {
    const settings = ensureSettings();
    const catMap = settings.categories || {};
    for (const id in entry.cats) {
      if (!Object.prototype.hasOwnProperty.call(entry.cats, id)) continue;
      let valStr = entry.cats[id];
      if (valStr == null) continue;

      let num = parseFloat(valStr.toString().replace(",", "."));
      if (isNaN(num)) num = 0;

      const catDef = catMap[id];
      const isIncome = catDef && catDef.type === "income";
      if (isIncome) income += num;
      else expense += num;
    }
  }

  // Eenvoudige invoer via jaartabel (zonder categorieën) + wizard-defaults
  const hasSimpleIncome = typeof entry._simpleIncome === "number";
  const hasSimpleExpense = typeof entry._simpleExpense === "number";
  const simpleIncome = hasSimpleIncome ? entry._simpleIncome : 0;
  const simpleExpense = hasSimpleExpense ? entry._simpleExpense : 0;

  // Wizard-inkomen/uitgaven per jaar worden alleen gebruikt als er
  // géén handmatige maandinvoer is voor die kant.
  const settings = ensureSettings();
  const wizIncomeMap = settings.yearWizardIncome || {};
  const wizExpenseMap = settings.yearWizardExpense || {};
  const wizardIncome = Number(wizIncomeMap[year]) || 0;
  const wizardExpense = Number(wizExpenseMap[year]) || 0;

  income += hasSimpleIncome ? simpleIncome : wizardIncome;
  expense += hasSimpleExpense ? simpleExpense : wizardExpense;

  let hasManualSavings = false;


  if (entry.savings && entry.savings.length > 0) {
    hasManualSavings = true;
    entry.savings.forEach((sv) => {
      let amt = parseFloat((sv.amount ?? "").toString().replace(",", "."));
      if (isNaN(amt)) amt = 0;
      if (sv.type === "deposit") deposits += amt;
      else if (sv.type === "withdrawal") withdrawals += amt;
    });
  }

  // Beschikbaar voor bank = inkomen - uitgaven - stortingen + opnames
  const available = income - expense - deposits + withdrawals;

  return { income, expense, deposits, withdrawals, available, hasManualSavings };
}

// ---------------------------------------------------------
// Potjes-helpers
// ---------------------------------------------------------

// Pot-definities zoals opgeslagen in settings.pots
export function getPots() {
  const settings = ensureSettings();
  return settings.pots;
}

// Bereken actuele pot-saldi t/m een bepaald jaar (doorlopend model)
export function computePotBalancesUntil(year) {
  const settings = ensureSettings();
  const potsDef = settings.pots;
  const monthData = loadMonthData();

  /** @type {Record<string, number>} */
  const balances = {};

  // beginsaldi per pot
  for (const potId of Object.keys(potsDef)) {
    const pot = potsDef[potId] || {};
    const start = typeof pot.startBalance === "number" ? pot.startBalance : 0;
    balances[potId] = start;
  }

  // loop over alle maanden t/m dit jaar
  const keys = Object.keys(monthData);
  for (const key of keys) {
    const [yStr] = key.split("-");
    const y = parseInt(yStr, 10);
    if (Number.isNaN(y) || y > year) continue;

    const entry = monthData[key] || {};
    const potTxs = Array.isArray(entry.potTransactions)
      ? entry.potTransactions
      : [];

    for (const tx of potTxs) {
      if (!tx || !tx.pot) continue;
      const potId = tx.pot;
      let amt = parseFloat((tx.amount ?? "").toString().replace(",", "."));
      if (isNaN(amt)) amt = 0;
      if (!balances.hasOwnProperty(potId)) {
        balances[potId] = 0;
      }
      if (tx.type === "deposit") {
        // geld VERSCHUIFT van bank naar pot
        balances[potId] += amt;
      } else if (tx.type === "withdrawal") {
        // geld VERSCHUIFT van pot naar bank
        balances[potId] -= amt;
      }
    }
  }

  return balances;
}

export function getNegativeLimit() {
  const settings = ensureSettings();
  return settings.negativeLimit;
}

// ---------------------------------------------------------
// Jaarendstaat (bank + spaar)
// ---------------------------------------------------------

export function computeYearEndState(year) {
  if (year < 1900) {
    return { bankEnd: 0, savingEnd: 0 };
  }
  
  // FIX: Haal de simulatie direct op ZONDER de interne cache te controleren.
  // Dit zorgt ervoor dat onze cache-opruiming in getStartingBankBalance en simulateYear 
  // niet wordt tegengewerkt door een hardnekkige cache.
  const sim = simulateYear(year);
  const result = { bankEnd: sim.bankEnd, savingEnd: sim.savingEnd };
  
  // Belangrijk: De resultaten MOETEN wel in de cache worden gezet voor toekomstig gebruik.
  // (simulateYear doet dit nu al, maar voor de zekerheid laten we dit zo)
  return result;
}

// ---------------------------------------------------------
// Jaar-simulatie (optie B: bankStart = bankEnd vorig jaar)
// + integratie met pot-transacties
// ---------------------------------------------------------

export function simulateYear(year) {
  if (year < 1900) {
    return {
      year,
      bankStart: 0,
      savingStart: 0,
      bankEnd: 0,
      savingEnd: 0,
      months: [],
    };
  }

  if (yearCache[year]) {
    return yearCache[year];
  }

  const settings = ensureSettings();
  const { yearStarting, yearBankStarting, yearMonthlySaving } = settings;

  // 1. BANK START BALANCE (Haalt beginsaldo op via onze nieuwe, cache-brekende functie)
  const bankStart = getStartingBankBalance(year); 
  let bank = bankStart; // <--- DIT IS DE CRUCIALE REGEL DIE MOET STAAN

  // 2. PREVIOUS YEAR SIMULATIE SETUP
  let prev = null;
  const prevYear = year - 1;

  if (prevYear >= 1900) {
    // Bereken vorig jaar alleen als het niet in cache zit
    if (!yearCache[prevYear]) {
        prev = simulateYear(prevYear);
    } else {
        prev = yearCache[prevYear];
    }
  }

  const monthData = loadMonthData();

  // 3. SAVINGS START BALANCE (Gebruikt de nu correct berekende 'prev')
  let savingStart;
  if (Object.prototype.hasOwnProperty.call(yearStarting, year)) {
    savingStart = Number(yearStarting[year]) || 0;
  } else {
    savingStart = prev ? Number(prev.savingEnd) || 0 : 0;
  }
  
  let cumDep = 0; 
  let cumWdr = 0; 

  const yms = Object.prototype.hasOwnProperty.call(yearMonthlySaving, year)
    ? yearMonthlySaving[year]
    : null;

  const months = [];

  for (let m = 1; m <= 12; m++) {
    const t = computeMonthTotalsFor(year, m);

    let depExtra = 0;
    let wdrExtra = 0;
    let availAdj = t.available;

    // 1) Jaar-maandbedrag (oude jaar-spaarlogica) + expliciete 0 check
    const key = `${year}-${m < 10 ? "0" + m : m}`;
    const entry = monthData[key] || {};
    const explicitNoSaving = entry._explicitNoSaving === true;

    // Alleen jaar-maandbedrag toepassen als:
    // - er een jaarsparing is
    // - er geen handmatige spaaractie is
    // - de gebruiker NIET expliciet 0 heeft gezet
    if (yms && !t.hasManualSavings && !explicitNoSaving) {
      if (yms.type === "deposit") {
        depExtra = yms.amount;
        availAdj -= yms.amount;
      } else if (yms.type === "withdrawal") {
        wdrExtra = yms.amount;
        availAdj += yms.amount;
      }
    }

    // 2) Pot-transacties van deze maand verwerken als bankmutatie
    const potTxs = Array.isArray(entry.potTransactions)
      ? entry.potTransactions
      : [];
    let potDeltaBank = 0;

    for (const tx of potTxs) {
      if (!tx || !tx.pot) continue;
      let amt = parseFloat((tx.amount ?? "").toString().replace(",", "."));
      if (isNaN(amt)) amt = 0;
      if (tx.type === "deposit") {
        // Storting naar pot → bank daalt
        potDeltaBank -= amt;
      } else if (tx.type === "withdrawal") {
        // Opname uit pot → bank stijgt
        potDeltaBank += amt;
      }
    }

    availAdj += potDeltaBank;

    // 3) Bepaal maandelijkse storting/opname spaarrekening (handmatig leading)
    let monthSaving;
    if (t.hasManualSavings) {
      // Handmatige spaaracties hebben voorrang op jaarsparen
      monthSaving = t.deposits - t.withdrawals;
    } else if (yms) {
      if (yms.type === "deposit") {
        monthSaving = t.deposits + yms.amount - t.withdrawals;
      } else if (yms.type === "withdrawal") {
        monthSaving = t.deposits - (t.withdrawals + yms.amount);
      } else {
        monthSaving = t.deposits - t.withdrawals;
      }
    } else {
      monthSaving = t.deposits - t.withdrawals;
    }

    cumDep += t.deposits + depExtra;
    cumWdr += t.withdrawals + wdrExtra;
    bank += availAdj;

    const savingEnd = savingStart + cumDep - cumWdr;

    months.push({
      month: m,
      income: t.income,
      expense: t.expense,
      available: availAdj,
      bankEnd: bank,
      savingEnd,
      monthSaving,
      hasManualSavings: t.hasManualSavings,
      potTransactionCount: potTxs.length,
    });
  }

  const savingEndFinal = months.length
    ? months[months.length - 1].savingEnd
    : savingStart;

  const result = {
    year,
    bankStart,
    savingStart,
    bankEnd: bank,
    savingEnd: savingEndFinal,
    months,
  };

  yearCache[year] = result;
  return result;

}


// ---------------------------------------------------------
// Premium helpers (categoriebeheer / proefperiode)
// ---------------------------------------------------------

export function getPremium() {
  const settings = loadSettings() || {};
  const p = settings.premium && typeof settings.premium === "object"
    ? settings.premium
    : { active: false, trialStart: null, trialUsed: false };
  return {
    active: !!p.active,
    trialStart: p.trialStart || null,
    trialUsed: !!p.trialUsed,
  };
}

export function setPremiumActive(active) {
  const settings = loadSettings() || {};
  if (!settings.premium || typeof settings.premium !== "object") {
    settings.premium = { active: !!active, trialStart: null, trialUsed: false };
  } else {
    settings.premium.active = !!active;
  }
  saveSettings(settings);
}

export function startPremiumTrial() {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const settings = loadSettings() || {};
  const p = settings.premium && typeof settings.premium === "object"
    ? settings.premium
    : { active: false, trialStart: null, trialUsed: false };

  p.active = true;
  p.trialStart = today;
  p.trialUsed = true;

  settings.premium = p;
  saveSettings(settings);
}

export function isTrialActive() {
  const p = getPremium();
  if (!p.active || !p.trialStart) return false;

  const start = new Date(p.trialStart);
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export function isPremiumActiveForUI() {
  const p = getPremium();
  if (!p.active) return false;
  if (!p.trialStart) return true; // betaald of onbeperkt
  return isTrialActive();
}



// ---------------------------------------------------------
// Category Data Helpers (Module 3 foundation)
// ---------------------------------------------------------

export function getCategories() {
  const settings = loadSettings() || {};
  if (!settings.categories || typeof settings.categories !== "object") {
    settings.categories = {
      overig: {
        id: "overig",
        label: "Overig",
        color: "#808080",
        icon: "default",
        system: true
      }
    };
    saveSettings(settings);
  }
  if (!settings.categories.overig) {
    settings.categories.overig = {
      id: "overig",
      label: "Overig",
      color: "#808080",
      icon: "default",
      system: true
    };
    saveSettings(settings);
  }
  return settings.categories;
}

export function saveCategories(newCats) {
  const settings = loadSettings() || {};
  settings.categories = newCats;
  saveSettings(settings);
}

export function addCategory(catDef) {
  const settings = loadSettings() || {};
  settings.categories = settings.categories || {};
  if (settings.categories[catDef.id]) return;
  settings.categories[catDef.id] = { ...catDef, system:false };
  saveSettings(settings);
}

export function updateCategory(id, patch) {
  const settings = loadSettings() || {};
  const cats = settings.categories || {};
  if (!cats[id]) return;
  cats[id] = { ...cats[id], ...patch };
  saveSettings(settings);
}

export function deleteCategory(id) {
  const settings = loadSettings() || {};
  const cats = settings.categories || {};
  if (!cats[id] || cats[id].system) return;

  // Move values from deleted category to overig
  if (settings.years) {
    for (const y of Object.keys(settings.years)) {
      const yearData = settings.years[y];
      for (const m of Object.keys(yearData)) {
        const md = yearData[m];
        if (!md.categoryExpenses) continue;
        const val = md.categoryExpenses[id] || 0;
        if (val > 0) {
          md.categoryExpenses.overig = (md.categoryExpenses.overig || 0) + val;
        }
        delete md.categoryExpenses[id];
      }
    }
  }
  delete cats[id];
  saveSettings(settings);
}

export function getMonthCategoryExpenses(year, month) {
  const settings = loadSettings() || {};
  const ydata = settings.years?.[year];
  if (!ydata) return null;
  const mdata = ydata[month];
  if (!mdata) return null;

  if (!mdata.categoryExpenses) {
    const exp = Number(mdata.expense || 0);
    mdata.categoryExpenses = { overig: exp };
    saveSettings(settings);
  }
  if (mdata.categoryExpenses.overig == null) {
    mdata.categoryExpenses.overig = 0;
    saveSettings(settings);
  }
  return mdata.categoryExpenses;
}

export function setMonthCategoryExpenses(year, month, map) {
  const settings = loadSettings() || {};
  const ydata = settings.years?.[year];
  if (!ydata) return;
  const mdata = ydata[month];
  if (!mdata) return;
  mdata.categoryExpenses = map;
  saveSettings(settings);
}

export function resetMonthToOverig(year, month) {
  const settings = loadSettings() || {};
  const ydata = settings.years?.[year];
  if (!ydata) return;
  const mdata = ydata[month];
  if (!mdata) return;
  const exp = Number(mdata.expense || 0);
  mdata.categoryExpenses = { overig: exp };
  saveSettings(settings);
}

