// scripts/backup.js
import {
  STORAGE_KEY_CATS,
  STORAGE_KEY_MONTH,
  STORAGE_KEY_SETTINGS,
  loadCats,
  loadMonthData,
  loadSettings,
  saveCats,
  saveMonthData,
  saveSettings,
} from "./storage.js";

export function initBackupModule(onDataChanged) {
  const exportBtn = document.getElementById("exportDataBtn");
  const importBtn = document.getElementById("importDataBtn");
  const fileInput = document.getElementById("importFileInput");

  if (!exportBtn || !importBtn || !fileInput) {
    return; // UI niet aanwezig, niets te doen
  }

  exportBtn.addEventListener("click", () => {
    try {
      const payload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        cats: loadCats(),
        month: loadMonthData(),
        settings: loadSettings(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finflow-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export mislukt. Probeer het opnieuw.");
    }
  });

  importBtn.addEventListener("click", () => {
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target.result);
        const obj = JSON.parse(text);

        if (!obj || typeof obj !== "object") {
          throw new Error("Geen geldig backupbestand.");
        }

        if (obj.cats) {
          saveCats(obj.cats);
        }
        if (obj.month) {
          saveMonthData(obj.month);
        }
        if (obj.settings) {
          saveSettings(obj.settings);
        }

        if (typeof onDataChanged === "function") {
          onDataChanged();
        }

        alert("Backup succesvol geïmporteerd.");
      } catch (err) {
        console.error(err);
        alert("Import mislukt. Is dit wel een FinFlow-backup?");
      } finally {
        fileInput.value = "";
      }
    };

    reader.onerror = () => {
      alert("Kon het backupbestand niet lezen.");
      fileInput.value = "";
    };

    reader.readAsText(file, "utf-8");
  });
}
