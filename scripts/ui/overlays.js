// scripts/ui/overlays.js
// Generic overlay helpers for FinFlow.

export function showOverlayElement(overlay) {
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

export function hideOverlayElement(overlay) {
  if (!overlay) return;
  overlay.classList.add("hidden");
}

export function toggleOverlay(overlay, show) {
  if (!overlay) return;
  if (show) {
    showOverlayElement(overlay);
  } else {
    hideOverlayElement(overlay);
  }
}
