// scripts/categories/categories-sheet.js
// Bevat de logica voor het openen, sluiten en renderen van de categorieën-beheer overlay.

import { getCategories, resetCaches } from "../core/state.js";
import {
    openNewCategorySheet,
    openEditCategorySheet,
    deleteCategory
} from "./categories.js"; // Huidige categories.js

// De algemene callback om de UI te verversen (meestal renderYear)
let onSheetCloseCallback = null; 


/**
 * Opent de overlay om categorieën te beheren.
 * @param {function} onClose - Callback om de UI te verversen na het sluiten van de sheet (meestal renderYear).
 */
export function openYearCategoriesSheet(onClose) {
    onSheetCloseCallback = onClose;

    const overlay = document.getElementById("yearCategoriesOverlay");
    if (!overlay) {
        console.error("Categorieën overlay (yearCategoriesOverlay) niet gevonden.");
        return;
    }

    // Zorg ervoor dat de sluit-handler is gekoppeld
    const closeBtn = overlay.querySelector("#closeCategoriesSheetBtn");
    if (closeBtn) {
        closeBtn.onclick = closeYearCategoriesSheet;
    }
    
    // Toon de overlay en render de lijst
    overlay.classList.remove("hidden");
    renderCategoriesList();
}


/**
 * Sluit de categorieën-beheer overlay en voert de callback uit.
 */
export function closeYearCategoriesSheet() {
    const overlay = document.getElementById("yearCategoriesOverlay");
    if (overlay) {
        overlay.classList.add("hidden");
    }
    
    // Voer de callback uit om de hoofd UI te verversen
    if (onSheetCloseCallback) {
        onSheetCloseCallback();
        onSheetCloseCallback = null; // Reset de callback
    }
}


/**
 * Rendert de lijst met categorieën binnen de categorieën-sheet.
 */
export function renderCategoriesList() {
    const list = document.getElementById("yearCategoriesList");
    if (!list) return;

    list.innerHTML = "";

    const categories = getCategories();
    
    // De callback voor elke actie (bewerken/verwijderen) - ververst ALLEEN de lijst
    const onActionComplete = () => {
        resetCaches();
        renderCategoriesList(); 
    };

    // We filteren systeemcategorieën (zoals 'overig') eruit
    Object.values(categories).filter(cat => !cat.system).forEach(cat => {
        // Gebruik de 'label' van de state categorieën als de 'name'
        const catName = cat.label; 
        
        const item = document.createElement("div");
        item.className = "category-item";
        item.innerHTML = `
            <span class="category-name">${catName}</span>
            <div class="category-actions">
                <button class="ff-btn ff-btn--icon ff-btn--small ff-btn--secondary" data-action="edit" data-name="${catName}">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="ff-btn ff-btn--icon ff-btn--small ff-btn--secondary" data-action="delete" data-name="${catName}">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });

    // Event Delegation voor Edit/Delete acties
    list.onclick = (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        // Haal de naam op
        const name = btn.dataset.name;
        const action = btn.dataset.action;

        if (action === 'edit') {
            // openEditCategorySheet verwacht de categorie naam (label) en de callback
            openEditCategorySheet(name, onActionComplete);
        } else if (action === 'delete') {
            const cat = Object.values(categories).find(c => c.label === name);
            if (cat && window.confirm(`Weet je zeker dat je categorie "${cat.label}" wilt verwijderen? Alle data voor deze categorie zal verloren gaan.`)) {
                // deleteCategory verwacht de categorie naam en de callback
                deleteCategory(name, onActionComplete);
            }
        }
    };

    // Koppel de Nieuwe Categorie knop
    const newCatBtn = document.getElementById("addNewCategoryBtn");
    if (newCatBtn) {
        newCatBtn.onclick = () => openNewCategorySheet(onActionComplete);
    }
}