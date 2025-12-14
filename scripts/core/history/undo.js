// scripts/core/history/undo.js
// Undo-helpers. Nog niet gekoppeld aan UI, maar klaar voor toekomstig gebruik.

import { popHistoryEntry, peekHistoryEntry } from "./history-store.js";

/**
 * Voert een undo-operatie uit op basis van de laatst bekende snapshot.
 * De daadwerkelijke toepassing op settings/month-data wordt later toegevoegd.
 */
export function undoLast() {
  const entry = popHistoryEntry();
  if (!entry) return null;
  // Toekomstige implementatie: entry.applyUndo();
  return entry;
}

/**
 * Geeft de laatst beschikbare undo-snapshot terug zonder deze te verwijderen.
 */
export function getPendingUndo() {
  return peekHistoryEntry();
}
