// scripts/core/history/snapshot.js
// Maakt snapshots van de relevante applicatiestatus (settings + maanddata).
// Wordt voorbereid voor toekomstig undo/redo-gebruik.

import { loadSettings } from "../storage.js";
import { loadMonthData } from "../storage.js";

/**
 * Maakt een shallow snapshot van settings.
 */
export function createSettingsSnapshot() {
  const settings = loadSettings() || {};
  return JSON.parse(JSON.stringify(settings));
}

/**
 * Maakt een snapshot van alle maanden voor een gegeven jaar.
 * @param {number} year
 * @returns {Record<string, any>}
 */
export function createYearMonthsSnapshot(year) {
  const months = {};
  for (let m = 1; m <= 12; m++) {
    months[m] = loadMonthData(year, m);
  }
  return months;
}
