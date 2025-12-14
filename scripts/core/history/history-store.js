// scripts/core/history/history-store.js
// Centrale opslag voor undo/redo-snapshots.
// Systeem is voorbereid maar nog niet gekoppeld, zodat huidig gedrag gelijk blijft.

const historyStack = [];
const redoStack = [];

/**
 * Voegt een nieuwe snapshot toe aan de undo-stack en wist de redo-stack.
 * @param {{ type:string, payload:any }} entry
 */
export function pushHistoryEntry(entry) {
  historyStack.push(entry);
  // Nieuwe wijziging maakt redo-stack ongeldig
  redoStack.length = 0;
}

/**
 * Haalt de laatst toegevoegde snapshot van de undo-stack.
 */
export function popHistoryEntry() {
  return historyStack.pop() || null;
}

/**
 * Kijkt naar de laatst toegevoegde snapshot zonder deze te verwijderen.
 */
export function peekHistoryEntry() {
  return historyStack.length ? historyStack[historyStack.length - 1] : null;
}

/**
 * Voegt een entry toe aan de redo-stack.
 */
export function pushRedoEntry(entry) {
  redoStack.push(entry);
}

/**
 * Haalt de laatst toegevoegde entry van de redo-stack.
 */
export function popRedoEntry() {
  return redoStack.pop() || null;
}

/**
 * Kijkt naar de laatst toegevoegde redo-entry zonder deze te verwijderen.
 */
export function peekRedoEntry() {
  return redoStack.length ? redoStack[redoStack.length - 1] : null;
}

/**
 * Leegt beide stacks (bijvoorbeeld bij volledige reset).
 */
export function clearHistory() {
  historyStack.length = 0;
  redoStack.length = 0;
}
