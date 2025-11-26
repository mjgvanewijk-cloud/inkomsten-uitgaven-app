// scripts/state.js
import { loadCats, loadMonthData, loadSettings } from "./storage.js";

export let currentMonthKey = null;
export let currentYear = new Date().getFullYear();

let yearCache = {};
let yearInProgress = {};

export function resetCaches() {
  yearCache = {};
  yearInProgress = {};
}

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
  const arr = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  return arr[m - 1] || `m${m}`;
}


// Bepaal het standaard maandbedrag van een categorie voor een gegeven jaar.
// Gebruikt amountsByYear indien aanwezig; valt terug op c.amount als er niets bekend is.
function getCategoryAmountForYear(c, year) {
  if (c && c.amountsByYear && typeof c.amountsByYear === "object") {
    const years = Object.keys(c.amountsByYear)
      .map((k) => parseInt(k, 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => a - b);

    if (years.length > 0) {
      let chosen = null;
      for (const y of years) {
        if (y <= year) {
          chosen = y;
        }
      }

      if (chosen !== null) {
        return c.amountsByYear[String(chosen)];
      }

      // Als alle jaren groter zijn dan het gevraagde jaar:
      // gebruik het vroegste bekende jaar als fallback.
      return c.amountsByYear[String(years[0])];
    }
  }

  return c && c.amount != null ? c.amount : "";
}

// Per maand: totalen inclusief spaaracties van deze maand
export function computeMonthTotalsFor(year, month) {
  const key = `${year}-${month < 10 ? "0" + month : month}`;
  const monthData = loadMonthData();
  const cats = loadCats();
  const entry = monthData[key] || { cats: {}, savings: [] };

  let income = 0;
  let expense = 0;
  let deposits = 0;
  let withdrawals = 0;

  cats.forEach((c) => {
    const valStr = entry.cats && Object.prototype.hasOwnProperty.call(entry.cats, c.name)
      ? entry.cats[c.name]
      : getCategoryAmountForYear(c, year);

    const yearOfMonth = year;

    if (!c.startYear || yearOfMonth >= c.startYear) {
      let num = parseFloat((valStr ?? "").toString().replace(",", "."));
      if (isNaN(num)) num = 0;
      if (c.type === "income") income += num;
      else expense += num;
    }
  });

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

  // Beschikbaar = inkomen - uitgaven - stortingen + opnames
  const available = income - expense - deposits + withdrawals;

  return { income, expense, deposits, withdrawals, available, hasManualSavings };
}

// Jaarendstaat: eindsaldo bank + spaar

export function computeYearEndState(year) {
  if (year < 1900) {
    return { bankEnd: 0, savingEnd: 0 };
  }
  if (yearCache[year]) return yearCache[year];

  const sim = simulateYear(year);
  const result = { bankEnd: sim.bankEnd, savingEnd: sim.savingEnd };
  yearCache[year] = result;
  return result;
}


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

  const settings = loadSettings();
  const { yearStarting, yearBankStarting, yearMonthlySaving } = settings;

  const prev = simulateYear(year - 1);

  let savingStart;
  if (Object.prototype.hasOwnProperty.call(yearStarting, year)) {
    savingStart = Number(yearStarting[year]) || 0;
  } else {
    savingStart = prev ? Number(prev.savingEnd) || 0 : 0;
  }

  let bankStart;
  if (Object.prototype.hasOwnProperty.call(yearBankStarting, year)) {
    const tmp = Number(yearBankStarting[year]);
    bankStart = isNaN(tmp) ? 0 : tmp;
  } else {
    bankStart = prev ? Number(prev.bankEnd) || 0 : 0;
  }

  let bank = bankStart;
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

    // Alleen maandelijkse spaaractie toepassen in maanden zonder handmatige spaaractie
    if (yms && !t.hasManualSavings) {
      if (yms.type === "deposit") {
        depExtra = yms.amount;
        availAdj -= yms.amount;
      } else if (yms.type === "withdrawal") {
        wdrExtra = yms.amount;
        availAdj += yms.amount;
      }
    }

    // Bepaal maandelijkse storting/opname spaarrekening (handmatig leading)
    let monthSaving = 0;
    if (t.hasManualSavings) {
      // Handmatige spaaracties leidend: automatische spaaractie telt niet mee
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
    });
  }

  const savingEnd = months.length
    ? months[months.length - 1].savingEnd
    : savingStart;

  return {
    year,
    bankStart,
    savingStart,
    bankEnd: bank,
    savingEnd,
    months,
  };
}


