(function() {

"use strict";

if (window.__portatourEnhancerLoaded) {
    console.log("Enhancer bereits geladen");
    return;
}
window.__portatourEnhancerLoaded = true;

console.log("Portatour Android Enhancer 1.3 geladen");

const CONTAINER_ID = "#cpcp_foto_container";
const FILE_SELECTOR = "input[type='file']";
const MAX_FILES = 8;

let isProcessing = false;
let progressOverlay = null;

/* =========================================
   Progress Overlay
========================================= */

function showProgress(current, total) {

    if (!progressOverlay) {
        progressOverlay = document.createElement("div");
        progressOverlay.id = "pt-multiupload-overlay";

        progressOverlay.style.position = "fixed";
        progressOverlay.style.bottom = "20px";
        progressOverlay.style.right = "20px";
        progressOverlay.style.background = "rgba(0,0,0,0.85)";
        progressOverlay.style.color = "white";
        progressOverlay.style.padding = "10px 16px";
        progressOverlay.style.borderRadius = "8px";
        progressOverlay.style.fontSize = "14px";
        progressOverlay.style.zIndex = "999999";
        progressOverlay.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        progressOverlay.style.fontFamily = "Arial, sans-serif";

        document.body.appendChild(progressOverlay);
    }

    progressOverlay.textContent = `Bild ${current} von ${total} wird hochgeladen…`;
}

function hideProgress() {
    if (progressOverlay) {
        progressOverlay.remove();
        progressOverlay = null;
    }
}

/* =========================================
   Multiple dauerhaft aktivieren
========================================= */

function enableMultiple() {
    const container = document.querySelector(CONTAINER_ID);
    if (!container) return;

    const input = container.querySelector(FILE_SELECTOR);
    if (!input) return;

    if (!input.multiple) {
        input.multiple = true;
        console.log("Multiple aktiviert");
    }
}

const domObserver = new MutationObserver(enableMultiple);

domObserver.observe(document.body, {
    childList: true,
    subtree: true
});

/* =========================================
   Bestehende Dateien zählen
========================================= */

function getExistingFileCount() {
    const container = document.querySelector(CONTAINER_ID);
    if (!container) return 0;

    return container.querySelectorAll(".existingFile").length;
}

/* =========================================
   Capture-Hook
========================================= */

document.addEventListener('change', async function(e) {

    if (isProcessing) return;

    const container = document.querySelector(CONTAINER_ID);
    if (!container) return;

    const input = container.querySelector(FILE_SELECTOR);
    if (!input || e.target !== input) return;

    const files = Array.from(input.files);
    if (files.length <= 1) return;

    const existing = getExistingFileCount();
    const remaining = MAX_FILES - existing;

    if (remaining <= 0) {
        alert("Maximale Anzahl von 8 Bildern bereits erreicht.");
        return;
    }

    const filesToUpload = files.slice(0, remaining);

    if (files.length > remaining) {
        alert(`Nur ${remaining} weitere Bilder möglich.`);
    }

    console.log("Multi-Upload erkannt:", filesToUpload.length);

    e.stopImmediatePropagation();

    isProcessing = true;

    try {
        await handleSequentialUpload(filesToUpload);
        console.log("Alle Uploads abgeschlossen.");
    } catch (err) {
        console.error("Fehler beim Multi-Upload:", err);
    } finally {
        hideProgress();
        isProcessing = false;
    }

}, true);

/* =========================================
   Serieller Upload
========================================= */

async function handleSequentialUpload(files) {

    const total = files.length;

    for (let i = 0; i < total; i++) {

        const file = files[i];

        showProgress(i + 1, total);

        console.log("Starte Upload:", file.name);

        const freshInput = getFreshInput();
        if (!freshInput) throw "Input nicht gefunden";

        const dt = new DataTransfer();
        dt.items.add(file);

        Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'files'
        ).set.call(freshInput, dt.files);

        freshInput.dispatchEvent(new Event('change', { bubbles: true }));

        await waitUntilUploadFinished();
    }
}

/* =========================================
   Upload-Ende erkennen
========================================= */

function waitUntilUploadFinished() {

    return new Promise((resolve, reject) => {

        const container = document.querySelector(CONTAINER_ID);
        if (!container) {
            reject("Container nicht gefunden");
            return;
        }

        const startCount =
            container.querySelectorAll(".existingFile").length;

        const observer = new MutationObserver(() => {

            const newCount =
                container.querySelectorAll(".existingFile").length;

            if (newCount > startCount) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject("Upload Timeout");
        }, 60000);
    });
}

/* =========================================
   Hilfsfunktion
========================================= */

function getFreshInput() {
    const container = document.querySelector(CONTAINER_ID);
    if (!container) return null;
    return container.querySelector(FILE_SELECTOR);
}

/* =========================================
   Bildvorschau in Android WebView korrigieren
========================================= */

const previewObserver = new MutationObserver(() => {

    const img = document.getElementById("previewImage");

    if (!img) return;
    if (img.dataset.webviewFixed) return;

    img.dataset.webviewFixed = "1";

    img.style.display = "block";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.width = "300px";
    img.style.height = "auto";
    img.style.visibility = "visible";
    img.style.opacity = "1";

});

previewObserver.observe(document.body, {
    childList: true,
    subtree: true
});

/* =========================================
   Popup-Overlay in Android WebView korrigieren
========================================= */

const overlayObserver = new MutationObserver(() => {

    const overlays = document.querySelectorAll(".overlayItem");

    for (const overlay of overlays) {

        // Nur das Overlay der Bildvorschau bearbeiten
        if (!overlay.querySelector("#previewImage")) {
            continue;
        }

        if (overlay.dataset.webviewFixed) {
            continue;
        }

        overlay.dataset.webviewFixed = "1";

        overlay.style.background = "rgba(0,0,0,0.45)";
        overlay.style.position = "fixed";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.right = "0";
        overlay.style.bottom = "0";
    }

});

overlayObserver.observe(document.body, {
    childList: true,
    subtree: true
});

/* Initialisierung */
enableMultiple();

})();
