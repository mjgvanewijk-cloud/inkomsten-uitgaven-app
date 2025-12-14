// scripts/ui/components/components.js
// Basis UI-component helpers voor FinFlow.
// Deze helpers kunnen door wizard/year worden gebruikt voor consistente UI.

export function applyPrimaryButtonStyle(button) {
  if (!button) return;
  button.classList.add("ff-btn", "ff-btn--primary");
}

export function applySecondaryButtonStyle(button) {
  if (!button) return;
  button.classList.add("ff-btn", "ff-btn--secondary");
}

export function applyInputStyle(input) {
  if (!input) return;
  input.classList.add("ff-input");
}
