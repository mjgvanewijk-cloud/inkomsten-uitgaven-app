// scripts/storage.js
export const STORAGE_KEY_CATS = "finflow_categories_v7";
export const STORAGE_KEY_MONTH = "finflow_monthdata_v7";
export const STORAGE_KEY_SETTINGS = "finflow_settings_v8";


export function loadCats() {
  try {
    const s = localStorage.getItem(STORAGE_KEY_CATS);
    if (!s) return [];
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];

    const currentY = new Date().getFullYear();

    return arr
      .filter((raw) => raw && typeof raw === "object")
      .map((raw) => {
        const c = { ...raw };

        // Zorg voor type
        if (c.type !== "income" && c.type !== "expense") {
          c.type = "expense";
        }

        // amountsByYear normaliseren
        if (!c.amountsByYear || typeof c.amountsByYear !== "object") {
          const baseAmount = c.amount ?? "";
          const yearKey =
            typeof c.startYear === "number" && !isNaN(c.startYear)
              ? String(c.startYear)
              : String(currentY);
          c.amountsByYear = { [yearKey]: baseAmount };
        } else {
          const fixed = {};
          Object.keys(c.amountsByYear).forEach((k) => {
            const y = parseInt(k, 10);
            if (!Number.isNaN(y)) {
              fixed[String(y)] = c.amountsByYear[k];
            }
          });
          c.amountsByYear = fixed;
        }

        return c;
      });
  } catch {
    return [];
  }
}


export function saveCats(arr) {
  localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(arr));
}

export function loadMonthData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY_MONTH);
    if (!s) return {};
    const obj = JSON.parse(s);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function saveMonthData(obj) {
  localStorage.setItem(STORAGE_KEY_MONTH, JSON.stringify(obj));
}

export function loadSettings() {
  try {
    const s = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!s) {
      return {
        yearStarting: {},
        yearBankStarting: {},
        yearMonthlySaving: {},
      };
    }
    const obj = JSON.parse(s) || {};
    obj.yearStarting ??= {};
    obj.yearBankStarting ??= {};
    obj.yearMonthlySaving ??= {};
    return obj;
  } catch {
    return {
      yearStarting: {},
      yearBankStarting: {},
      yearMonthlySaving: {},
    };
  }
}

export function saveSettings(obj) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(obj));
}
