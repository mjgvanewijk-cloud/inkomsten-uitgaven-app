// scripts/core/history/redo.js
// Redo-helpers. Nog niet gekoppeld aan UI, maar klaar voor toekomstig gebruik.

import { popRedoEntry, peekRedoEntry } from "./history-store.js";

/**
 * Voert een redo-operatie uit op basis van de laatst bekende snapshot.
 * De daadwerkelijke toepassing op settings/month-data wordt later toegevoegd.
 */
export function redoLast() {
  const entry = popRedoEntry();
  if (!entry) return null;
  // Toekomstige implementatie: entry.applyRedo();
  return entry;
}

/**
 * Geeft de laatst beschikbare redo-snapshot terug zonder deze te verwijderen.
 */
export function getPendingRedo() {
  return peekRedoEntry();
}
