/* -------------------------------------------------------------
   NEXORA AI OPTICAL ENGINE & PHOTO TRY-ON (tryon.js)
   ------------------------------------------------------------- */

import { JEWELRY_CATALOG } from './products.js';

// CALIBRATION AND HUD CACHE
const TryOnState = {
    activeItem: JEWELRY_CATALOG[0], // Luminescence Collar
    activeTarget: 'necklace', // 'necklace', 'nosepin', 'left_earring', 'right_earring', 'ring', 'generic'
    rotationLocked: false,
    imageLocked: false,         // Global image lock — freezes ALL jewelry movements
    isAuthenticated: false,     // Only draw jewelry when user is signed in
    hoveredTarget: null,        // Currently hovered draggable target
    transitioning: false,       // In a transition state when switching items
    transitionTimer: 0.0,       // 0 to 1 countdown
    sparkleParticles: [],       // Array of active sparkle particles
    scanningProgress: 0.0,      // Facial scanning progress indicator (0.0 to 1.0)
    
    // Dictionary parameters for each calibration target separately
    offsets: {
        necklace: { x: 0, y: 0 },
        nosepin: { x: 0, y: 0 },
        left_earring: { x: 0, y: 0 },
        right_earring: { x: 0, y: 0 },
        ring: { x: 0, y: 0 },
        generic: { x: 0, y: 0 }
    },
    scales: {
        necklace: 1.0,
        nosepin: 1.0,
        left_earring: 1.0,
        right_earring: 1.0,
        ring: 1.0,
        generic: 1.0
    },
    rotations: {
        necklace: 0,
        nosepin: 0,
        left_earring: 0,
        right_earring: 0,
        ring: 0,
        generic: 0
    },
    pitch: {
        necklace: 0,
        nosepin: 0,
        left_earring: 0,
        right_earring: 0,
        ring: 0,
        generic: 0
    },
    yaw: {
        necklace: 0,
        nosepin: 0,
        left_earring: 0,
        right_earring: 0,
        ring: 0,
        generic: 0
    },
    
    isScanning: false,
    
    // Background Photo parameters
    bgImg: new Image(),
    isBgLoaded: false,
    isCustomUpload: false,
    
    // Drag-and-drop details
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragBaseOffsetX: 0,
    dragBaseOffsetY: 0,
    
    // Default model relative coordinates (mapped precisely to tryon_model_waist.png)
    modelCoordinates: {
        necklace: { px: 0.495, py: 0.48 },
        nosepin:  { px: 0.495, py: 0.30 },
        left_earring: { px: 0.42, py: 0.30 },
        right_earring: { px: 0.58, py: 0.30 },
        ring: { px: 0.50, py: 0.75 },
        generic: { px: 0.50, py: 0.40 }
    }
};

// Offscreen Canvas Cache for transparent background-free jewelry assets
const TransparentJewelryCache = {};

// Preset Relative Landmarks for the holographic face mesh overlay (scaled for waist-up model)
const FACE_MESH_MOCKUP_DATA = [
    // Jawline/Chin
    { id: 0, px: 0.497, py: 0.390 },
    { id: 1, px: 0.464, py: 0.378 },
    { id: 2, px: 0.437, py: 0.354 },
    { id: 3, px: 0.419, py: 0.318 },
    { id: 4, px: 0.419, py: 0.303, label: "Left Ear Lobe" },
    { id: 5, px: 0.530, py: 0.378 },
    { id: 6, px: 0.557, py: 0.354 },
    { id: 7, px: 0.575, py: 0.318 },
    { id: 8, px: 0.575, py: 0.303, label: "Right Ear Lobe" },
    // Eyes
    { id: 9, px: 0.461, py: 0.255 },
    { id: 10, px: 0.440, py: 0.252 },
    { id: 11, px: 0.476, py: 0.246 },
    { id: 12, px: 0.533, py: 0.255 },
    { id: 13, px: 0.554, py: 0.252 },
    { id: 14, px: 0.518, py: 0.246 },
    // Nose
    { id: 19, px: 0.497, py: 0.246, label: "Nose Bridge" },
    { id: 20, px: 0.496, py: 0.297, label: "Nose Tip" },
    { id: 21, px: 0.479, py: 0.303 },
    { id: 22, px: 0.515, py: 0.303 },
    // Mouth
    { id: 23, px: 0.497, py: 0.330 },
    { id: 24, px: 0.473, py: 0.327 },
    { id: 25, px: 0.521, py: 0.327 },
    { id: 26, px: 0.497, py: 0.351 },
    // Forehead
    { id: 27, px: 0.497, py: 0.180 },
    { id: 28, px: 0.455, py: 0.192 },
    { id: 29, px: 0.539, py: 0.192 }
];

const MESH_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Left jaw
    [0, 5], [5, 6], [6, 7], [7, 8], // Right jaw
    [9, 10], [10, 11], [11, 9], // Left eye
    [12, 13], [13, 14], [14, 12], // Right eye
    [19, 20], [20, 21], [20, 22], // Nose
    [23, 24], [23, 25], [24, 26], [25, 26], // Mouth
    [27, 28], [27, 29]
];

document.addEventListener("DOMContentLoaded", () => {
    initTryOnControls();
    listenToEvents();
    loadDefaultModel();
    precacheAllJewelry();

    // ── INIT: Read auth state directly from sessionStorage ──────────────────
    // auth.js fires nexora_auth_change during its own DOMContentLoaded, which
    // runs BEFORE this listener is registered (auth.js appears first in HTML).
    // Reading sessionStorage here ensures we never miss the initial login state.
    const savedUser = sessionStorage.getItem('nexora_mock_user');
    if (savedUser) {
        TryOnState.isAuthenticated = true;
        const canvas = document.getElementById('tryon-canvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
            canvas.style.pointerEvents = 'auto';
        }
    }

    // Listen for subsequent login / logout changes from auth.js
    window.addEventListener('nexora_auth_change', (e) => {
        TryOnState.isAuthenticated = !!e.detail?.loggedIn;
        const canvas = document.getElementById('tryon-canvas');
        if (!TryOnState.isAuthenticated) {
            // Clear canvas → model face shows through clean
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.style.cursor = 'default';
                canvas.style.pointerEvents = 'none'; // no drag while locked out
            }
            // Reset image lock if still engaged
            if (TryOnState.imageLocked) {
                TryOnState.imageLocked = false;
                const btn = document.getElementById('btn-image-lock');
                if (btn) {
                    const icon  = btn.querySelector('.lock-btn-icon');
                    const label = btn.querySelector('.lock-btn-label');
                    const sub   = btn.querySelector('.lock-btn-sub');
                    if (icon)  icon.textContent  = '\uD83D\uDD13';
                    if (label) label.textContent = 'Lock Image';
                    if (sub)   sub.textContent   = 'Freeze all jewelry in place';
                    btn.classList.remove('locked');
                    btn.setAttribute('aria-pressed', 'false');
                }
            }
        } else {
            // Re-enable canvas interaction after login
            if (canvas) {
                canvas.style.cursor = 'grab';
                canvas.style.pointerEvents = 'auto'; // must be explicit — CSS default is 'none'
            }
        }
    });
});

/* ==========================================
   1. PRE-CACHING TRANSPARENT JEWELRY (CHROMA SHADER)
   ========================================== */
function precacheAllJewelry() {
    JEWELRY_CATALOG.forEach(item => {
        precacheTransparentJewelry(item.image);
    });
}

function precacheTransparentJewelry(imageSrc) {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
        const W = img.width;
        const H = img.height;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width  = W;
        tempCanvas.height = H;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, W, H);
        const data = imgData.data;

        // If any corner already has native alpha=0, trust the PNG alpha channel
        const cornerIdxs = [0, W - 1, (H - 1) * W, (H - 1) * W + W - 1];
        if (cornerIdxs.some(i => data[i * 4 + 3] < 128)) {
            TransparentJewelryCache[imageSrc] = tempCanvas;
            return;
        }

        // Detect background type from corner brightness
        const cornerBright = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
        const isWhiteBg    = cornerBright > 180;
        // More aggressive threshold — catches near-white fringe pixels too
        const BG_THRESH    = isWhiteBg ? 185 : 45;

        const pixBright = (i) => 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const isBgPix   = (idx) => {
            const b = pixBright(idx * 4);
            return isWhiteBg ? b >= BG_THRESH : b <= BG_THRESH;
        };

        // --- PASS 1: 8-connected DFS flood fill from all border pixels ---
        // 8-connectivity (includes diagonals) captures corner anti-alias fringe
        const visited = new Uint8Array(W * H);
        const stack = [];

        const seedIfBg = (idx) => {
            if (idx >= 0 && idx < W * H && !visited[idx] && isBgPix(idx)) {
                visited[idx] = 1;
                stack.push(idx);
            }
        };
        for (let x = 0; x < W; x++) { seedIfBg(x); seedIfBg((H - 1) * W + x); }
        for (let y = 1; y < H - 1; y++) { seedIfBg(y * W); seedIfBg(y * W + W - 1); }

        while (stack.length > 0) {
            const idx = stack.pop();
            const x = idx % W;
            const y = (idx / W) | 0;

            // 8 neighbors (including diagonals)
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                    const nIdx = ny * W + nx;
                    if (!visited[nIdx] && isBgPix(nIdx)) {
                        visited[nIdx] = 1;
                        stack.push(nIdx);
                    }
                }
            }
        }

        // Make flood-filled pixels fully transparent
        for (let i = 0; i < W * H; i++) {
            if (visited[i]) data[i * 4 + 3] = 0;
        }

        // --- PASS 2: Fringe/halo shrink pass ---
        // Any non-background pixel that is bright (>210) AND directly adjacent
        // to a now-transparent pixel is an anti-aliased edge fringe → remove it.
        const FRINGE_THRESH = isWhiteBg ? 210 : -1;
        if (FRINGE_THRESH > 0) {
            const fringeRemove = new Uint8Array(W * H);
            for (let idx = 0; idx < W * H; idx++) {
                if (visited[idx]) continue; // already transparent
                const b = pixBright(idx * 4);
                if (b < FRINGE_THRESH) continue; // dark pixel = part of necklace chain
                const x = idx % W, y = (idx / W) | 0;
                // Check 4 cardinal neighbors for a transparent pixel
                const adj = [idx - 1, idx + 1, idx - W, idx + W];
                const adjX = [x - 1, x + 1, x, x];
                for (let k = 0; k < 4; k++) {
                    const nx = adjX[k];
                    if (nx < 0 || nx >= W) continue;
                    const nIdx = adj[k];
                    if (nIdx < 0 || nIdx >= W * H) continue;
                    if (visited[nIdx] || fringeRemove[nIdx]) { fringeRemove[idx] = 1; break; }
                }
            }
            for (let i = 0; i < W * H; i++) {
                if (fringeRemove[i]) data[i * 4 + 3] = 0;
            }
        }

        tempCtx.putImageData(imgData, 0, 0);
        TransparentJewelryCache[imageSrc] = tempCanvas;
    };
}



/* ==========================================
   2. LOADING BACKGROUND PORTRAITS
   ========================================== */
function loadDefaultModel() {
    const modelImg = document.getElementById("tryon-model-img");
    if (!modelImg) return;

    // Load silently — no scan animation for the default model
    // Show the static model image immediately as a background
    modelImg.classList.remove('custom-active'); // ensure visible

    // Show/hide default vs remove photo button
    const btnResetModel = document.getElementById("btn-reset-model");
    const btnRemovePhoto = document.getElementById("btn-remove-photo");
    if (btnResetModel) btnResetModel.classList.remove("hidden");
    if (btnRemovePhoto) btnRemovePhoto.classList.add("hidden");

    TryOnState.bgImg.src = modelImg.src;
    TryOnState.bgImg.onload = () => {
        TryOnState.isBgLoaded = true;
        TryOnState.isCustomUpload = false;
        TryOnState.isScanning = false;
        const loader = document.getElementById("tryon-loader");
        if (loader) loader.classList.add("hidden");
        resetPlacementOffsets();
        updateTelemetry("MODEL OPTICS READY", "green-ping", 3, 468);
    };
    // Also set onerror fallback
    TryOnState.bgImg.onerror = () => {
        updateTelemetry("MODEL LOAD ERROR", "red-ping", 0, 0);
    };
}

let webcamStream = null;

function runFacialScan() {
    TryOnState.isScanning = true;
    TryOnState.scanningProgress = 0.0;
    
    const loader = document.getElementById("tryon-loader");
    if (loader) loader.classList.remove("hidden");

    // Smoothly increment scanningProgress to 1.0 over 2.2 seconds (approx 130 frames)
    const scanDuration = 2200; // ms
    const startTime = performance.now();

    function animateScan(time) {
        if (!TryOnState.isScanning) return;
        const elapsed = time - startTime;
        const progress = Math.min(1.0, elapsed / scanDuration);
        TryOnState.scanningProgress = progress;

        // Update HUD telemetry text during scan
        if (progress < 0.25) {
            updateTelemetry("FACIAL SYMMETRY ACQUIRING...", "yellow-ping", 8, Math.floor(progress * 150));
        } else if (progress < 0.55) {
            updateTelemetry("MAPPING NOSE BRIDGE LANDMARKS...", "yellow-ping", 6, Math.floor(progress * 300));
        } else if (progress < 0.85) {
            updateTelemetry("CALIBRATING EAR LOBE OFFSETS...", "yellow-ping", 4, Math.floor(progress * 420));
        } else {
            updateTelemetry("SYNCHRONIZING ORBITAL MATRICES...", "green-ping", 2, Math.floor(progress * 468));
        }

        if (progress < 1.0) {
            requestAnimationFrame(animateScan);
        } else {
            TryOnState.isScanning = false;
            if (loader) loader.classList.add("hidden");
            resetPlacementOffsets();
            
            const textVal = TryOnState.isCustomUpload ? "CUSTOM STUDIO CALIBRATION ONLINE" : "MODEL OPTICS ONLINE";
            updateTelemetry(textVal, "green-ping", TryOnState.isCustomUpload ? 5 : 3, TryOnState.isCustomUpload ? 280 : 468);
            window.showToastNotification("AI Facial structure analyzed. Custom calibration coordinates loaded.");
            triggerItemSwitchTransition();
        }
    }
    requestAnimationFrame(animateScan);
}

function spawnSparkles(x, y) {
    TryOnState.sparkleParticles = [];
    for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.0;
        TryOnState.sparkleParticles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5, // float up slightly
            alpha: 1.0,
            size: 1.5 + Math.random() * 2.5,
            color: Math.random() > 0.4 ? 'rgba(212, 175, 55, ' : 'rgba(255, 255, 255, '
        });
    }
}

function triggerItemSwitchTransition() {
    TryOnState.transitioning = true;
    TryOnState.transitionTimer = 1.0;
    
    const canvas = document.getElementById("tryon-canvas");
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const layoutW = rect.width;
        const layoutH = rect.height;
        const coords = getTargetScreenCoords(layoutW, layoutH, TryOnState.activeTarget);
        spawnSparkles(coords.x, coords.y);
    }
}

function handleCustomUpload(file) {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
        const tempImg = new Image();
        tempImg.src = e.target.result;

        tempImg.onload = () => {
            TryOnState.bgImg = tempImg;
            TryOnState.isBgLoaded = true;
            TryOnState.isCustomUpload = true;

            // Hide the static default model img — canvas takes full control now
            const modelImg = document.getElementById("tryon-model-img");
            if (modelImg) modelImg.classList.add('custom-active');

            // Show/hide default vs remove photo button
            const btnResetModel = document.getElementById("btn-reset-model");
            const btnRemovePhoto = document.getElementById("btn-remove-photo");
            if (btnResetModel) btnResetModel.classList.add("hidden");
            if (btnRemovePhoto) btnRemovePhoto.classList.remove("hidden");

            runFacialScan();
        };
    };
    reader.readAsDataURL(file);
}

/* ==========================================
   3. CONTROLS INITIALIZATION
   ========================================== */
function initTryOnControls() {
    const fileInput = document.getElementById("tryon-file-input");
    const btnResetModel = document.getElementById("btn-reset-model");
    const btnRemovePhoto = document.getElementById("btn-remove-photo");
    
    const sliderScale = document.getElementById("slider-scale");
    const sliderRotation = document.getElementById("slider-rotation");
    const sliderY = document.getElementById("slider-y");
    const sliderX = document.getElementById("slider-x");
    const sliderPitch = document.getElementById("slider-pitch");
    const sliderYaw = document.getElementById("slider-yaw");
    
    const valScale = document.getElementById("val-scale");
    const valRotation = document.getElementById("val-rotation");
    const valY = document.getElementById("val-y");
    const valX = document.getElementById("val-x");
    const valPitch = document.getElementById("val-pitch");
    const valYaw = document.getElementById("val-yaw");

    const btnSaveLook = document.getElementById("btn-save-look");
    const btnShareLook = document.getElementById("btn-share-look");
    const canvas = document.getElementById("tryon-canvas");
    const btnRotationLock = document.getElementById("btn-rotation-lock");
    const btnStraighten = document.getElementById("btn-straighten");

    // Populate Selector lists
    populateItemSelectors();

    // Custom File uploader listener
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleCustomUpload(e.target.files[0]);
            }
        });
    }

    // Take Photo webcam listener
    const btnTakePhoto = document.getElementById("btn-take-photo");
    const webcamModal = document.getElementById("webcam-modal");
    const btnCloseWebcam = document.getElementById("btn-close-webcam");
    const btnWebcamCancel = document.getElementById("btn-webcam-cancel");
    const btnWebcamCapture = document.getElementById("btn-webcam-capture");
    const video = document.getElementById("webcam-video");

    function closeWebcamModal() {
        if (webcamModal) webcamModal.classList.add("hidden");
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
    }

    if (btnTakePhoto) {
        btnTakePhoto.addEventListener("click", () => {
            if (webcamModal) webcamModal.classList.remove("hidden");
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
                .then(stream => {
                    webcamStream = stream;
                    if (video) video.srcObject = stream;
                })
                .catch(err => {
                    console.error("Webcam error:", err);
                    window.showToastNotification("Webcam access not available. Please upload a photo instead.");
                    closeWebcamModal();
                });
        });
    }

    if (btnCloseWebcam) btnCloseWebcam.addEventListener("click", closeWebcamModal);
    if (btnWebcamCancel) btnWebcamCancel.addEventListener("click", closeWebcamModal);
    
    if (btnWebcamCapture) {
        btnWebcamCapture.addEventListener("click", () => {
            if (video && webcamStream) {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = video.videoWidth || 640;
                tempCanvas.height = video.videoHeight || 480;
                const ctx = tempCanvas.getContext("2d");
                // Mirror horizontally for selfie photo feel
                ctx.translate(tempCanvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                
                const imgUrl = tempCanvas.toDataURL("image/png");
                const snappedImg = new Image();
                snappedImg.src = imgUrl;
                snappedImg.onload = () => {
                    TryOnState.bgImg = snappedImg;
                    TryOnState.isBgLoaded = true;
                    TryOnState.isCustomUpload = true;
                    
                    const modelImg = document.getElementById("tryon-model-img");
                    if (modelImg) modelImg.classList.add('custom-active');

                    if (btnResetModel) btnResetModel.classList.add("hidden");
                    if (btnRemovePhoto) btnRemovePhoto.classList.remove("hidden");

                    closeWebcamModal();
                    runFacialScan();
                };
            }
        });
    }

    // Drag-and-drop file upload listeners on the viewport rendering box
    const viewportBox = document.getElementById("tryon-viewport-render-box");
    const dragOverlay = document.getElementById("viewport-drag-overlay");
    if (viewportBox && dragOverlay) {
        viewportBox.addEventListener("dragenter", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (TryOnState.isAuthenticated) {
                dragOverlay.classList.remove("hidden");
            }
        });
        viewportBox.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        dragOverlay.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragOverlay.classList.add("hidden");
        });
        dragOverlay.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragOverlay.classList.add("hidden");
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith("image/")) {
                    handleCustomUpload(file);
                } else {
                    window.showToastNotification("Unsupported file type. Please upload images only.");
                }
            }
        });
    }

    // Reset Model listener
    if (btnResetModel) {
        btnResetModel.addEventListener("click", () => {
            loadDefaultModel();
            window.showToastNotification("Reset viewport to default model.");
        });
    }

    // Remove custom photo listener
    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener("click", () => {
            loadDefaultModel();
            if (fileInput) fileInput.value = "";
            window.showToastNotification("Removed uploaded photo.");
        });
    }

    // Lock Rotation listener
    if (btnRotationLock) {
        btnRotationLock.addEventListener("click", () => {
            toggleRotationLock();
        });
    }

    // Wear Simple & Straight click listener
    if (btnStraighten) {
        btnStraighten.addEventListener("click", () => {
            const target = TryOnState.activeTarget;
            TryOnState.offsets[target].x = 0;
            TryOnState.rotations[target] = 0;
            TryOnState.pitch[target] = 0;
            TryOnState.yaw[target] = 0;
            syncSlidersToActiveTarget();
            window.showToastNotification("Jewelry aligned straight and centered!");
        });
    }

    // Sliders input mapping - controls the currently selected activeTarget
    if (sliderScale && valScale) {
        sliderScale.addEventListener("input", (e) => {
            const target = TryOnState.activeTarget;
            TryOnState.scales[target] = parseFloat(e.target.value);
            valScale.innerText = `${TryOnState.scales[target].toFixed(2)}x`;
        });
    }

    const btnScaleDown = document.getElementById("btn-scale-down");
    const btnScaleUp = document.getElementById("btn-scale-up");
    if (btnScaleDown) {
        btnScaleDown.addEventListener("click", () => {
            if (TryOnState.imageLocked) return;
            const target = TryOnState.activeTarget;
            let scale = TryOnState.scales[target] || 1.0;
            scale = Math.max(0.3, Math.min(2.2, scale - 0.05));
            TryOnState.scales[target] = scale;
            if (sliderScale) sliderScale.value = scale;
            if (valScale) valScale.innerText = `${scale.toFixed(2)}x`;
        });
    }
    if (btnScaleUp) {
        btnScaleUp.addEventListener("click", () => {
            if (TryOnState.imageLocked) return;
            const target = TryOnState.activeTarget;
            let scale = TryOnState.scales[target] || 1.0;
            scale = Math.max(0.3, Math.min(2.2, scale + 0.05));
            TryOnState.scales[target] = scale;
            if (sliderScale) sliderScale.value = scale;
            if (valScale) valScale.innerText = `${scale.toFixed(2)}x`;
        });
    }
    if (sliderRotation && valRotation) {
        sliderRotation.addEventListener("input", (e) => {
            if (TryOnState.rotationLocked) return;
            const target = TryOnState.activeTarget;
            TryOnState.rotations[target] = parseInt(e.target.value);
            valRotation.innerText = `${TryOnState.rotations[target]}°`;
        });
    }
    if (sliderY && valY) {
        sliderY.addEventListener("input", (e) => {
            const target = TryOnState.activeTarget;
            TryOnState.offsets[target].y = parseInt(e.target.value);
            valY.innerText = `${TryOnState.offsets[target].y} px`;
        });
    }
    if (sliderX && valX) {
        sliderX.addEventListener("input", (e) => {
            const target = TryOnState.activeTarget;
            TryOnState.offsets[target].x = parseInt(e.target.value);
            valX.innerText = `${TryOnState.offsets[target].x} px`;
        });
    }
    if (sliderPitch && valPitch) {
        sliderPitch.addEventListener("input", (e) => {
            if (TryOnState.rotationLocked) return;
            const target = TryOnState.activeTarget;
            TryOnState.pitch[target] = parseInt(e.target.value);
            valPitch.innerText = `${TryOnState.pitch[target]}°`;
        });
    }
    if (sliderYaw && valYaw) {
        sliderYaw.addEventListener("input", (e) => {
            if (TryOnState.rotationLocked) return;
            const target = TryOnState.activeTarget;
            TryOnState.yaw[target] = parseInt(e.target.value);
            valYaw.innerText = `${TryOnState.yaw[target]}°`;
        });
    }

    // Canvas Drag-and-Drop state machine binding
    if (canvas) {
        canvas.addEventListener("mousedown", handleDragStart);
        canvas.addEventListener("mousemove", handleDragMove);
        canvas.addEventListener("mouseup", handleDragEnd);
        canvas.addEventListener("mouseleave", handleDragEnd);

        // Wheel listener for direct rotation/scale
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (TryOnState.imageLocked) return; // 🔒 Global lock
            const target = TryOnState.activeTarget;
            if (e.shiftKey) {
                // Scale
                let scale = TryOnState.scales[target] || 1.0;
                scale += e.deltaY > 0 ? -0.02 : 0.02;
                scale = Math.max(0.3, Math.min(2.2, scale));
                TryOnState.scales[target] = scale;
                
                const sliderScale = document.getElementById("slider-scale");
                const valScale = document.getElementById("val-scale");
                if (sliderScale) sliderScale.value = scale;
                if (valScale) valScale.innerText = `${scale.toFixed(2)}x`;
            } else {
                // Rotate
                if (TryOnState.rotationLocked) return;
                let rot = TryOnState.rotations[target] || 0;
                rot += e.deltaY > 0 ? 3 : -3;
                if (rot > 180) rot -= 360;
                if (rot < -180) rot += 360;
                TryOnState.rotations[target] = rot;
                
                const sliderRotation = document.getElementById("slider-rotation");
                const valRotation = document.getElementById("val-rotation");
                if (sliderRotation) sliderRotation.value = rot;
                if (valRotation) valRotation.innerText = `${rot}°`;
            }
        });

        // Touch support for mobiles
        canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleDragStart({ clientX: touch.clientX, clientY: touch.clientY });
            }
        });
        canvas.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleDragMove({ clientX: touch.clientX, clientY: touch.clientY });
            }
        });
        canvas.addEventListener("touchend", handleDragEnd);
    }

    // Save and Share Look clicks
    if (btnSaveLook) {
        btnSaveLook.addEventListener("click", () => {
            window.showToastNotification("Capturing calibration look...");
            setTimeout(() => {
                window.showToastNotification("Saved look successfully to Couture bag presets!");
            }, 800);
        });
    }

    if (btnShareLook) {
        btnShareLook.addEventListener("click", () => {
            window.showToastNotification("Copying encrypted share coordinates...");
            setTimeout(() => {
                window.showToastNotification("Link copied! Send to share your custom look.");
            }, 800);
        });
    }

    // Bind frame loop
    requestAnimationFrame(renderViewportLoop);

    // ---- GLOBAL IMAGE LOCK BUTTON ----
    const btnImageLock = document.getElementById('btn-image-lock');
    if (btnImageLock) {
        btnImageLock.addEventListener('click', () => {
            TryOnState.imageLocked = !TryOnState.imageLocked;
            const locked = TryOnState.imageLocked;

            // Update button appearance
            const icon  = btnImageLock.querySelector('.lock-btn-icon');
            const label = btnImageLock.querySelector('.lock-btn-label');
            const sub   = btnImageLock.querySelector('.lock-btn-sub');
            if (icon)  icon.textContent  = locked ? '🔒' : '🔓';
            if (label) label.textContent = locked ? 'Unlock Image' : 'Lock Image';
            if (sub)   sub.textContent   = locked ? 'All jewelry frozen' : 'Freeze all jewelry in place';
            btnImageLock.classList.toggle('locked', locked);
            btnImageLock.setAttribute('aria-pressed', locked.toString());

            // Disable/enable all sliders when globally locked
            const sliders = ['slider-scale','slider-rotation','slider-pitch','slider-yaw','slider-x','slider-y'];
            sliders.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = locked;
            });

            // Also restore the canvas cursor/pointer-events
            const canvas = document.getElementById('tryon-canvas');
            if (canvas) {
                canvas.style.cursor = locked ? 'not-allowed' : 'grab';
                canvas.style.pointerEvents = locked ? 'auto' : 'auto'; // always keep interactive
            }

            window.showToastNotification(locked ? '🔒 Image locked — no accidental moves' : '🔓 Image unlocked');
        });
    }
}

/* ==========================================
   4. DRAG-AND-DROP STATE MECHANICS
   ========================================== */
function getTargetScreenCoords(layoutW, layoutH, targetName) {
    const baseCoords = TryOnState.isCustomUpload 
        ? { px: targetName === 'left_earring' ? 0.37 : (targetName === 'right_earring' ? 0.63 : 0.5), py: 0.5 }
        : TryOnState.modelCoordinates[targetName] || { px: 0.5, py: 0.5 };
        
    const baseX = layoutW * baseCoords.px;
    const baseY = layoutH * baseCoords.py;

    const currentX = baseX + TryOnState.offsets[targetName].x;
    const currentY = baseY + TryOnState.offsets[targetName].y;
    
    return { x: currentX, y: currentY };
}

function getTargetClickRadius(layoutW, targetName) {
    const baseWidth = layoutW * 0.46;
    const targetScale = TryOnState.scales[targetName];
    
    if (targetName === 'necklace') {
        return baseWidth * 0.5 * targetScale;
    } else if (targetName === 'left_earring' || targetName === 'right_earring') {
        return baseWidth * 0.14 * targetScale;
    } else if (targetName === 'nosepin') {
        return 25 * targetScale;
    } else if (targetName === 'ring') {
        return baseWidth * 0.25 * targetScale;
    } else if (targetName === 'generic') {
        return baseWidth * 0.3 * targetScale;
    }
    return 30;
}

function toggleRotationLock(forceState) {
    const btn = document.getElementById("btn-rotation-lock");
    if (!btn) return;
    
    const locked = forceState !== undefined ? forceState : !TryOnState.rotationLocked;
    TryOnState.rotationLocked = locked;
    
    // Update button UI
    const icon  = btn.querySelector('.lock-btn-icon');
    const label = btn.querySelector('.lock-btn-label');
    const sub   = btn.querySelector('.lock-btn-sub');
    if (icon)  icon.textContent  = locked ? '🔒' : '🔓';
    if (label) label.textContent = locked ? 'Unlock Rotation' : 'Lock Rotation';
    if (sub)   sub.textContent   = locked ? 'Orientation angles frozen' : 'Freeze Z-Rotation & 3D Tilts';
    btn.classList.toggle('locked', locked);
    btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    
    // Toggle sliders disabled state
    const sliderRotation = document.getElementById("slider-rotation");
    const sliderPitch = document.getElementById("slider-pitch");
    const sliderYaw = document.getElementById("slider-yaw");
    
    if (sliderRotation) sliderRotation.disabled = locked;
    if (sliderPitch) sliderPitch.disabled = locked;
    if (sliderYaw) sliderYaw.disabled = locked;
}

window.toggleRotationLock = toggleRotationLock;

function syncSlidersToActiveTarget() {
    const target = TryOnState.activeTarget;
    
    const sliderScale = document.getElementById("slider-scale");
    const sliderRotation = document.getElementById("slider-rotation");
    const sliderY = document.getElementById("slider-y");
    const sliderX = document.getElementById("slider-x");
    const sliderPitch = document.getElementById("slider-pitch");
    const sliderYaw = document.getElementById("slider-yaw");
    
    const valScale = document.getElementById("val-scale");
    const valRotation = document.getElementById("val-rotation");
    const valY = document.getElementById("val-y");
    const valX = document.getElementById("val-x");
    const valPitch = document.getElementById("val-pitch");
    const valYaw = document.getElementById("val-yaw");

    if (sliderScale && valScale) {
        sliderScale.value = TryOnState.scales[target];
        valScale.innerText = `${TryOnState.scales[target].toFixed(2)}x`;
    }
    if (sliderRotation && valRotation) {
        sliderRotation.value = TryOnState.rotations[target];
        valRotation.innerText = `${TryOnState.rotations[target]}°`;
    }
    if (sliderPitch && valPitch) {
        sliderPitch.value = TryOnState.pitch[target] || 0;
        valPitch.innerText = `${TryOnState.pitch[target] || 0}°`;
    }
    if (sliderYaw && valYaw) {
        sliderYaw.value = TryOnState.yaw[target] || 0;
        valYaw.innerText = `${TryOnState.yaw[target] || 0}°`;
    }
    if (sliderY && valY) {
        sliderY.value = TryOnState.offsets[target].y;
        valY.innerText = `${TryOnState.offsets[target].y} px`;
    }
    if (sliderX && valX) {
        sliderX.value = TryOnState.offsets[target].x;
        valX.innerText = `${TryOnState.offsets[target].x} px`;
    }
    
    let targetLabel = target.toUpperCase().replace('_', ' ');
    updateTelemetry(`${targetLabel} CONFIGURING`, "green-ping", TryOnState.isCustomUpload ? 5 : 3, TryOnState.isCustomUpload ? 280 : 468);

    // Update active class on target selector buttons
    const listContainer = document.getElementById("tryon-target-list");
    if (listContainer) {
        listContainer.querySelectorAll(".target-btn").forEach(btn => {
            if (btn.getAttribute("data-target-id") === target) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    // Update button visual state to match global lock state
    const btnRotationLock = document.getElementById("btn-rotation-lock");
    if (btnRotationLock) {
        const locked = TryOnState.rotationLocked;
        const icon  = btnRotationLock.querySelector('.lock-btn-icon');
        const label = btnRotationLock.querySelector('.lock-btn-label');
        const sub   = btnRotationLock.querySelector('.lock-btn-sub');
        if (icon)  icon.textContent  = locked ? '🔒' : '🔓';
        if (label) label.textContent = locked ? 'Unlock Rotation' : 'Lock Rotation';
        if (sub)   sub.textContent   = locked ? 'Orientation angles frozen' : 'Freeze Z-Rotation & 3D Tilts';
        btnRotationLock.classList.toggle('locked', locked);
        btnRotationLock.setAttribute('aria-pressed', locked ? 'true' : 'false');
    }
    
    if (sliderRotation) sliderRotation.disabled = TryOnState.rotationLocked;
    if (sliderPitch) sliderPitch.disabled = TryOnState.rotationLocked;
    if (sliderYaw) sliderYaw.disabled = TryOnState.rotationLocked;
}

function hitTestTarget(clickX, clickY, layoutW, layoutH) {
    const item = TryOnState.activeItem;
    if (!item) return null;

    let targetsToCheck = [];
    if (item.tryonType === 'necklace') {
        targetsToCheck = ['necklace'];
    } else if (item.tryonType === 'nosepin') {
        targetsToCheck = ['nosepin'];
    } else if (item.tryonType === 'earrings') {
        targetsToCheck = ['left_earring', 'right_earring'];
    } else if (item.tryonType === 'ring') {
        targetsToCheck = ['ring'];
    } else {
        targetsToCheck = ['generic'];
    }

    let closestTarget = null;
    let minDistance = Infinity;

    targetsToCheck.forEach(targetName => {
        const coords = getTargetScreenCoords(layoutW, layoutH, targetName);
        const radius = getTargetClickRadius(layoutW, targetName);
        const dx = clickX - coords.x;
        const dy = clickY - coords.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Generous grab threshold: Math.max(90, radius * 1.5) for extremely easy movement and grab
        const hitRadius = Math.max(90, radius * 1.5);
        if (dist <= hitRadius) {
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = targetName;
            }
        }
    });

    return closestTarget;
}

function handleDragStart(e) {
    const canvas = document.getElementById("tryon-canvas");
    if (!canvas || TryOnState.isScanning || !TryOnState.isBgLoaded) return;
    if (TryOnState.imageLocked) return; // 🔒 Global lock — no movement allowed

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const layoutW = rect.width;
    const layoutH = rect.height;

    const closestTarget = hitTestTarget(clickX, clickY, layoutW, layoutH);

    if (closestTarget) {
        TryOnState.activeTarget = closestTarget;
        TryOnState.isDragging = true;
        TryOnState.dragStartX = e.clientX;
        TryOnState.dragStartY = e.clientY;
        TryOnState.dragBaseOffsetX = TryOnState.offsets[closestTarget].x;
        TryOnState.dragBaseOffsetY = TryOnState.offsets[closestTarget].y;
        
        syncSlidersToActiveTarget();

        document.getElementById("telemetry-drag-state").innerText = "ACTIVE";
        canvas.style.cursor = "grabbing";
    }
}

function handleDragMove(e) {
    const canvas = document.getElementById("tryon-canvas");
    if (!canvas) return;

    if (!TryOnState.isDragging) {
        // Hover mode — check if hovering over any item
        if (TryOnState.imageLocked || TryOnState.isScanning || !TryOnState.isBgLoaded || !TryOnState.isAuthenticated) {
            canvas.style.cursor = 'default';
            TryOnState.hoveredTarget = null;
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const layoutW = rect.width;
        const layoutH = rect.height;

        const hovered = hitTestTarget(clickX, clickY, layoutW, layoutH);
        TryOnState.hoveredTarget = hovered;
        canvas.style.cursor = hovered ? 'grab' : 'default';
        return;
    }

    if (TryOnState.imageLocked) return; // 🔒 Global lock

    const target = TryOnState.activeTarget;
    const dx = e.clientX - TryOnState.dragStartX;
    const dy = e.clientY - TryOnState.dragStartY;

    let newX = TryOnState.dragBaseOffsetX + dx;
    let newY = TryOnState.dragBaseOffsetY + dy;

    // Sync to sliders constraints
    const sliderX = document.getElementById("slider-x");
    const sliderY = document.getElementById("slider-y");
    
    if (sliderX) {
        newX = Math.max(parseInt(sliderX.min), Math.min(parseInt(sliderX.max), newX));
        sliderX.value = newX;
        document.getElementById("val-x").innerText = `${newX} px`;
    }
    
    if (sliderY) {
        newY = Math.max(parseInt(sliderY.min), Math.min(parseInt(sliderY.max), newY));
        sliderY.value = newY;
        document.getElementById("val-y").innerText = `${newY} px`;
    }

    TryOnState.offsets[target].x = newX;
    TryOnState.offsets[target].y = newY;
}

function handleDragEnd() {
    if (!TryOnState.isDragging) return;
    TryOnState.isDragging = false;
    document.getElementById("telemetry-drag-state").innerText = "IDLE";
    
    const canvas = document.getElementById("tryon-canvas");
    if (canvas) canvas.style.cursor = "grab";
}

function resetPlacementOffsets() {
    const item = TryOnState.activeItem;
    if (!item) return;

    if (item.tryonType === 'necklace') {
        TryOnState.activeTarget = 'necklace';
    } else if (item.tryonType === 'nosepin') {
        TryOnState.activeTarget = 'nosepin';
    } else if (item.tryonType === 'earrings') {
        TryOnState.activeTarget = 'left_earring';
    } else if (item.tryonType === 'ring') {
        TryOnState.activeTarget = 'ring';
    } else {
        TryOnState.activeTarget = 'generic';
    }

    // Reset all offsets/scales/rotations to defaults
    const targets = ['necklace', 'nosepin', 'left_earring', 'right_earring', 'ring', 'generic'];
    targets.forEach(t => {
        TryOnState.offsets[t] = { x: 0, y: 0 };
        TryOnState.scales[t] = 1.0;
        TryOnState.rotations[t] = 0;
        TryOnState.pitch[t] = 0;
        TryOnState.yaw[t] = 0;
    });

    updateTargetSelectors();
    syncSlidersToActiveTarget();
}

function updateTargetSelectors() {
    const group = document.getElementById("target-selector-group");
    const listContainer = document.getElementById("tryon-target-list");
    if (!group || !listContainer) return;

    const item = TryOnState.activeItem;
    if (!item) {
        group.style.display = "none";
        return;
    }

    let targets = [];
    if (item.tryonType === 'necklace') {
        targets = [{ id: 'necklace', name: 'Necklace' }];
    } else if (item.tryonType === 'nosepin') {
        targets = [{ id: 'nosepin', name: 'Nosepin' }];
    } else if (item.tryonType === 'earrings') {
        targets = [
            { id: 'left_earring', name: 'Left Ear' },
            { id: 'right_earring', name: 'Right Ear' }
        ];
    } else if (item.tryonType === 'ring') {
        targets = [{ id: 'ring', name: 'Ring' }];
    } else {
        targets = [{ id: 'generic', name: 'Item' }];
    }

    group.style.display = "block";

    listContainer.innerHTML = targets.map(t => {
        const activeClass = TryOnState.activeTarget === t.id ? "active" : "";
        return `
            <button class="target-btn ${activeClass}" data-target-id="${t.id}">
                <span>${t.name}</span>
            </button>
        `;
    }).join("");

    listContainer.querySelectorAll(".target-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target-id");
            TryOnState.activeTarget = targetId;
            
            // Sync slider UI to the newly selected target
            syncSlidersToActiveTarget();
            
            // Update active state of target buttons
            listContainer.querySelectorAll(".target-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

/* ==========================================
   5. ITEM SELECTORS
   ========================================== */
function populateItemSelectors() {
    const listContainer = document.getElementById("tryon-item-list");
    if (!listContainer) return;

    listContainer.innerHTML = JEWELRY_CATALOG.map((prod, idx) => {
        const activeClass = idx === 0 ? "active" : "";
        return `
            <button class="item-btn ${activeClass}" data-id="${prod.id}">
                <img src="${prod.image}" alt="${prod.name}" />
                <span>${prod.name.split(' ')[0]}</span>
            </button>
        `;
    }).join("");

    // Initialize spec box with first product
    updateActiveItemSpecs(JEWELRY_CATALOG[0]);

    listContainer.querySelectorAll(".item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            listContainer.querySelectorAll(".item-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const id = btn.getAttribute("data-id");
            const prod = JEWELRY_CATALOG.find(p => p.id === id);
            
            if (prod) {
                TryOnState.activeItem = prod;
                window.showToastNotification(`Active Item: ${prod.name}`);
                updateActiveItemSpecs(prod);
                runTelemetryScan();
            }
        });
    });
}

function updateActiveItemSpecs(prod) {
    const specBox = document.getElementById("tryon-active-spec-box");
    if (!specBox || !prod) return;
    specBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom: 0.4rem; font-weight:600; border-bottom: 1px solid rgba(212,175,55,0.15); padding-bottom: 0.3rem;">
            <span style="color:var(--gold-glow); text-transform:uppercase; letter-spacing:0.05em; font-family:'Outfit',sans-serif;">🛸 3D Asset: ${prod.name}</span>
            <span style="color:var(--metallic-silver); font-family:'Outfit',sans-serif;">${prod.fileSize}</span>
        </div>
        <div style="display:grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0.5rem; color:var(--metallic-silver); font-family:'Outfit',sans-serif;">
            <span>Format: <strong style="color:#fff; font-weight:500;">${prod.format.split(' ')[0]}</strong></span>
            <span>Polys: <strong style="color:#fff; font-weight:500;">${prod.polygons.split(' ')[0]}</strong></span>
            <span>Verts: <strong style="color:#fff; font-weight:500;">${prod.vertices.split(' ')[0]}</strong></span>
        </div>
    `;
}

function runTelemetryScan() {
    const loader = document.getElementById("tryon-loader");
    if (loader) loader.classList.remove("hidden");
    TryOnState.isScanning = true;
    TryOnState.scanningProgress = 0.0;

    const scanDuration = 800; // ms
    const startTime = performance.now();

    function animateQuickScan(time) {
        if (!TryOnState.isScanning) return;
        const elapsed = time - startTime;
        const progress = Math.min(1.0, elapsed / scanDuration);
        TryOnState.scanningProgress = progress;

        if (progress < 1.0) {
            requestAnimationFrame(animateQuickScan);
        } else {
            TryOnState.isScanning = false;
            if (loader) loader.classList.add("hidden");
            resetPlacementOffsets();
            
            const ptCount = TryOnState.isCustomUpload ? 280 : 468;
            const latencyVal = TryOnState.isCustomUpload ? 5 : 3;
            const textVal = TryOnState.isCustomUpload ? "CUSTOM CALIBRATION ACTIVE" : "MODEL MAPPING ACTIVE";
            updateTelemetry(textVal, "green-ping", latencyVal, ptCount);
            
            triggerItemSwitchTransition();
        }
    }
    requestAnimationFrame(animateQuickScan);
}

function updateTelemetry(status, pingClass, latency, points) {
    const statusText = document.getElementById("telemetry-status");
    const ping = document.querySelector(".ping-indicator");
    const latencyText = document.getElementById("telemetry-latency");
    const pointsCount = document.getElementById("mesh-points-count");
    
    if (statusText) statusText.innerText = status;
    if (ping) {
        ping.className = `ping-indicator ${pingClass}`;
    }
    if (latencyText) latencyText.innerText = latency;
    if (pointsCount) pointsCount.innerText = `POINTS: ${points} / 468`;
}

/* ==========================================
   FACIAL SCAN ANIMATION RENDERER
   ========================================== */
function drawScanningFacialMesh(ctx, layoutW, layoutH) {
    const scaleFactor = layoutW * 0.46;
    const centerX = layoutW / 2;
    const centerY = layoutH * 0.48;
    const scanY = TryOnState.scanningProgress * layoutH;

    const coordinates = FACE_MESH_MOCKUP_DATA.map(pt => {
        const x = centerX + (pt.px - 0.5) * scaleFactor;
        const y = centerY + (pt.py - 0.48) * scaleFactor;
        return { id: pt.id, x, y, label: pt.label };
    });

    // Draw laser sweep line
    ctx.save();
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 15;
    
    const laserGrad = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
    laserGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    laserGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.9)');
    laserGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = laserGrad;
    ctx.fillRect(0, scanY - 6, layoutW, 12);

    ctx.strokeStyle = 'rgba(255, 220, 100, 0.95)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(layoutW, scanY);
    ctx.stroke();
    ctx.restore();

    // Draw scanned connections and dots
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 0.5;
    
    MESH_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = coordinates.find(c => c.id === startIdx);
        const p2 = coordinates.find(c => c.id === endIdx);
        if (p1 && p2 && p1.y <= scanY && p2.y <= scanY) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });

    coordinates.forEach(pt => {
        if (pt.y <= scanY) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.label ? 2.5 : 1.2, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.shadowColor = '#d4af37';
            ctx.shadowBlur = 5;
            ctx.fill();
            
            if (pt.label && scanY - pt.y < 35) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '600 7px "Outfit", sans-serif';
                ctx.fillText(pt.label.toUpperCase(), pt.x + 8, pt.y + 2);
            }
        }
    });
    ctx.restore();
    
    // Draw HUD text
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("ANALYZING FACIAL STRUCTURE...", layoutW / 2, scanY - 12);
    ctx.restore();
}

/* ==========================================
   6. VIEWPORT CANVAS RENDERING LOOP
   ========================================== */
function renderViewportLoop() {
    const canvas = document.getElementById("tryon-canvas");
    if (!canvas || !TryOnState.isBgLoaded) {
        requestAnimationFrame(renderViewportLoop);
        return;
    }

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Fit canvas width/height to rendering box, scaling for high-DPI (HD) displays
    const box = canvas.parentElement;
    const layoutW = box.clientWidth;
    const layoutH = box.clientHeight;

    if (canvas.width !== layoutW * dpr || canvas.height !== layoutH * dpr) {
        canvas.width = layoutW * dpr;
        canvas.height = layoutH * dpr;
        canvas.style.width = layoutW + 'px';
        canvas.style.height = layoutH + 'px';
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If not authenticated: keep canvas transparent so model-img shows through.
    // Just draw a subtle sign-in hint badge and skip everything else.
    if (!TryOnState.isAuthenticated) {
        ctx.save();
        ctx.scale(dpr, dpr);
        // Subtle lock badge at bottom center
        const badgeW = 220, badgeH = 34;
        const bx = (layoutW - badgeW) / 2;
        const by = layoutH - badgeH - 14;
        ctx.fillStyle = 'rgba(10, 3, 24, 0.62)';
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 17);
        ctx.fill();
        ctx.fillStyle = 'rgba(158, 127, 39, 0.9)';
        ctx.font = '600 11px "Inter", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🔒  Sign in to try on jewelry', layoutW / 2, by + 22);
        ctx.restore();
        requestAnimationFrame(renderViewportLoop);
        return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw background image scaled to cover canvas boundaries
    drawBackgroundImage(ctx, layoutW, layoutH);

    // Draw telemetry time
    updateClockTelemetry();

    // Draw scanning mesh or regular/transition elements
    if (TryOnState.isScanning) {
        drawScanningFacialMesh(ctx, layoutW, layoutH);
    } else {
        if (!TryOnState.isCustomUpload) {
            drawHolographicMesh(ctx, layoutW, layoutH);
        }
        
        // Draw background-free jewelry overlays
        if (TryOnState.transitioning) {
            ctx.save();
            ctx.globalAlpha = 1.0 - TryOnState.transitionTimer;
            drawJewelryPlacement(ctx, layoutW, layoutH);
            ctx.restore();
        } else {
            drawJewelryPlacement(ctx, layoutW, layoutH);
        }
    }

    // Draw active particle sparkles (drifting stars)
    if (TryOnState.sparkleParticles.length > 0) {
        ctx.save();
        for (let i = TryOnState.sparkleParticles.length - 1; i >= 0; i--) {
            const p = TryOnState.sparkleParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.018; // Fade out
            
            if (p.alpha <= 0) {
                TryOnState.sparkleParticles.splice(i, 1);
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color + p.alpha + ')';
            ctx.shadowColor = '#d4af37';
            ctx.shadowBlur = 5;
            ctx.fill();
        }
        ctx.restore();
    }

    // Process transition timer
    if (TryOnState.transitioning) {
        TryOnState.transitionTimer -= 0.025; // Countdown ~40 frames
        if (TryOnState.transitionTimer <= 0) {
            TryOnState.transitioning = false;
            TryOnState.transitionTimer = 0;
        }

        // Draw expanding radial gold gradient pulse centered at active target coordinates
        const pulseProgress = 1.0 - TryOnState.transitionTimer;
        const coords = getTargetScreenCoords(layoutW, layoutH, TryOnState.activeTarget);
        
        ctx.save();
        const maxRadius = 150;
        const radius = pulseProgress * maxRadius;
        const grad = ctx.createRadialGradient(coords.x, coords.y, 2, coords.x, coords.y, radius);
        grad.addColorStop(0, `rgba(212, 175, 55, ${0.75 * TryOnState.transitionTimer})`);
        grad.addColorStop(0.4, `rgba(212, 175, 55, ${0.35 * TryOnState.transitionTimer})`);
        grad.addColorStop(0.8, `rgba(112, 26, 184, ${0.12 * TryOnState.transitionTimer})`);
        grad.addColorStop(1, `rgba(112, 26, 184, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();

    requestAnimationFrame(renderViewportLoop);
}

function drawBackgroundImage(ctx, layoutW, layoutH) {
    const img = TryOnState.bgImg;

    // Cover algorithm
    const canvasRatio = layoutW / layoutH;
    const imgRatio = img.width / img.height;
    
    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
        drawW = layoutW;
        drawH = layoutW / imgRatio;
        drawX = 0;
        drawY = (layoutH - drawH) / 2;
    } else {
        drawW = layoutH * imgRatio;
        drawH = layoutH;
        drawX = (layoutW - drawW) / 2;
        drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawHolographicMesh(ctx, layoutW, layoutH) {
    const scaleFactor = layoutW * 0.46;
    const centerX = layoutW / 2;
    const centerY = layoutH * 0.48;

    const coordinates = FACE_MESH_MOCKUP_DATA.map(pt => {
        const x = centerX + (pt.px - 0.5) * scaleFactor;
        const y = centerY + (pt.py - 0.48) * scaleFactor;
        return { id: pt.id, x, y, label: pt.label };
    });

    // Draw lines with light low-contrast amethyst color
    ctx.strokeStyle = 'rgba(112, 26, 184, 0.12)';
    ctx.lineWidth = 0.5;
    
    MESH_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = coordinates.find(c => c.id === startIdx);
        const p2 = coordinates.find(c => c.id === endIdx);
        if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });

    // Draw point markers
    coordinates.forEach(pt => {
        ctx.beginPath();
        if (pt.label) {
            ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#9e7f27'; // gold accents
            ctx.globalAlpha = 0.4;
        } else {
            ctx.arc(pt.x, pt.y, 1.0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.globalAlpha = 0.25;
        }
        ctx.fill();
        ctx.globalAlpha = 1.0; // restore
    });
}

/* ==========================================
   PROCEDURAL DIAMOND PENDANT NECKLACE RENDERER
   Draws an elegant chain with a diamond solitaire pendant
   ========================================== */
function drawDiamondPendantNecklace(ctx, cx, cy, scale, rotationRad, pitchRad, yawRad, isSelected, rotationLocked) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
    ctx.rotate(rotationRad);

    const chainW   = 120 * scale;   // half-width of chain span
    const chainH   = 55  * scale;   // depth the chain drapes down
    const chainY   = -30 * scale;   // top of chain relative to center
    const pendantH = 48  * scale;   // total pendant height
    const pendantY = chainY + chainH; // top of pendant

    // ---- Draw the platinum chain (catenary curve) ----
    ctx.beginPath();
    ctx.moveTo(-chainW, chainY);
    ctx.quadraticCurveTo(0, chainY + chainH * 1.2, chainW, chainY);
    const chainGrad = ctx.createLinearGradient(-chainW, 0, chainW, 0);
    chainGrad.addColorStop(0,   'rgba(160,170,190,0.7)');
    chainGrad.addColorStop(0.3, 'rgba(225,230,242,0.95)');
    chainGrad.addColorStop(0.5, 'rgba(245,248,255,1.0)');
    chainGrad.addColorStop(0.7, 'rgba(225,230,242,0.95)');
    chainGrad.addColorStop(1,   'rgba(160,170,190,0.7)');
    ctx.strokeStyle = chainGrad;
    ctx.lineWidth = 2.5 * scale;
    ctx.shadowColor = 'rgba(200,210,240,0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ---- Chain small link dots ----
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
        const t  = i / steps;
        const lx = -chainW + t * chainW * 2;
        const ly = chainY + (chainH * 1.2) * 4 * t * (1 - t); // quadratic
        const linkSize = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(lx, ly, linkSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,228,245,${0.7 + 0.3 * Math.sin(i * 0.9)})`;
        ctx.fill();
    }

    // ---- Short bail connecting chain to pendant ----
    const bailX = 0;
    const bailY1 = pendantY;
    const bailY2 = pendantY + 10 * scale;
    ctx.beginPath();
    ctx.moveTo(bailX, bailY1);
    ctx.lineTo(bailX, bailY2);
    ctx.strokeStyle = 'rgba(215,222,238,0.95)';
    ctx.lineWidth = 3.5 * scale;
    ctx.stroke();

    // ---- Diamond pendant ---- (rhombus / brilliant shape)
    const dw = 22 * scale;   // half-width
    const dt = 10 * scale;   // table top half-width
    const dtY = bailY2;
    const midY = dtY + pendantH * 0.4;
    const botY = dtY + pendantH;

    ctx.beginPath();
    ctx.moveTo(0, dtY - dt * 0.3);   // top tip
    ctx.lineTo( dt, dtY);             // table right
    ctx.lineTo( dw, midY);            // girdle right
    ctx.lineTo(0,  botY);             // culet bottom
    ctx.lineTo(-dw, midY);            // girdle left
    ctx.lineTo(-dt, dtY);             // table left
    ctx.closePath();

    const shimmer = 0.5 + 0.5 * Math.sin(Date.now() * 0.0018);
    const diamGrad = ctx.createRadialGradient(dw * 0.18, dtY + dw * 0.2, 0, 0, midY, dw * 1.4);
    diamGrad.addColorStop(0,    `rgba(255,255,255,${0.95 + shimmer * 0.05})`);
    diamGrad.addColorStop(0.12, `rgba(230,245,255,0.90)`);
    diamGrad.addColorStop(0.35, `rgba(180,210,255,${0.75 + shimmer * 0.1})`);
    diamGrad.addColorStop(0.65, `rgba(100,160,240,${0.60})`);
    diamGrad.addColorStop(0.88, `rgba(50,100,200,0.45)`);
    diamGrad.addColorStop(1.0,  `rgba(20, 60,160,0.35)`);
    ctx.fillStyle = diamGrad;
    ctx.fill();

    // Outline — platinum prong setting
    ctx.strokeStyle = `rgba(210,222,240,${0.7 + shimmer * 0.2})`;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // ---- Inner facet lines ----
    ctx.strokeStyle = `rgba(255,255,255,${0.20 + shimmer * 0.15})`;
    ctx.lineWidth = 0.6 * scale;
    // Horizontal girdle line
    ctx.beginPath();
    ctx.moveTo(-dw, midY);
    ctx.lineTo( dw, midY);
    ctx.stroke();
    // Crown facets
    ctx.beginPath();
    ctx.moveTo(-dt, dtY); ctx.lineTo(0, midY);
    ctx.moveTo( dt, dtY); ctx.lineTo(0, midY);
    ctx.moveTo(0,   dtY - dt * 0.3); ctx.lineTo(0, midY);
    ctx.stroke();
    // Pavilion facets
    ctx.beginPath();
    ctx.moveTo(-dw, midY); ctx.lineTo(0, botY);
    ctx.moveTo( dw, midY); ctx.lineTo(0, botY);
    ctx.stroke();

    // ---- Highlight flare ----
    if (shimmer > 0.7) {
        ctx.beginPath();
        ctx.arc(dt * 0.3, dtY + dt * 0.5, dt * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${shimmer * 0.85})`;
        ctx.fill();
    }

    // ---- Prong setting box ----
    ctx.beginPath();
    ctx.roundRect(-dt - 2 * scale, dtY - 4 * scale, (dt + 2 * scale) * 2, 10 * scale, 2 * scale);
    const prongGrad = ctx.createLinearGradient(-dt, 0, dt, 0);
    prongGrad.addColorStop(0,   'rgba(155,165,185,0.85)');
    prongGrad.addColorStop(0.5, 'rgba(235,240,250,0.98)');
    prongGrad.addColorStop(1,   'rgba(155,165,185,0.85)');
    ctx.fillStyle   = prongGrad;
    ctx.strokeStyle = 'rgba(200,210,230,0.8)';
    ctx.lineWidth   = 0.8 * scale;
    ctx.fill();
    ctx.stroke();

    // ---- Selection ring ----
    if (isSelected && !TryOnState.imageLocked) {
        const selR = dw + 20 * scale;
        ctx.beginPath();
        ctx.ellipse(0, midY, selR, pendantH * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(158, 127, 39, 0.55)';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#9e7f27';
        ctx.font = `700 ${Math.max(7, 8 * scale)}px monospace`;
        const label = rotationLocked ? 'DIAMOND PENDANT 🔒' : 'DIAMOND PENDANT';
        ctx.fillText(label, -selR, midY - pendantH * 0.65);
    }

    ctx.restore();
}

function drawJewelryPlacement(ctx, layoutW, layoutH) {
    const item = TryOnState.activeItem;
    if (!item) return;

    // Use offscreen canvas background-free representation instead of raw image elements
    const drawable = TransparentJewelryCache[item.image];
    if (!drawable) return;

    const baseWidth = layoutW * 0.46;

    if (item.tryonType === 'necklace') {
        const target = 'necklace';
        const targetScale = TryOnState.scales[target];
        const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
        const pitchRad    = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
        const yawRad      = ((TryOnState.yaw[target]   || 0) * Math.PI) / 180;
        
        const coords  = getTargetScreenCoords(layoutW, layoutH, target);
        const neckW   = baseWidth * 0.98 * targetScale;
        const neckH   = neckW * (drawable.height / drawable.width);

        ctx.save();
        ctx.translate(coords.x, coords.y);

        // ---- 3D Perspective via canvas setTransform ----
        // Simulate a shallow perspective: the top of the necklace is slightly
        // smaller (further away) and the bottom slightly larger (closer).
        // We achieve this by applying a vertical perspective skew matrix.
        const perspFactor = 0.0006 * targetScale; // depth curvature strength
        const cosY = Math.cos(yawRad);
        const cosP = Math.cos(pitchRad);
        const sinR = Math.sin(rotationRad);
        const cosR = Math.cos(rotationRad);

        // Custom 3D-ish transform matrix [a,b,c,d,e,f]:
        // adds a perspective skew so bottom widens slightly
        ctx.transform(
            cosR * cosY,          // a
            sinR * cosY,          // b
            -sinR * cosP + cosR * perspFactor * neckH * 0.5, // c  (horizontal perspective tilt)
            cosR * cosP,          // d
            0, 0
        );
        ctx.rotate(0); // rotation already absorbed above

        // Soft drop shadow for depth
        ctx.shadowColor   = 'rgba(30,20,60,0.35)';
        ctx.shadowBlur    = 18;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 6;

        if (item.id === 'nexora-necklace-01') {
            const cutFactor = 0.40; // cut the top 40% of the necklace loop
            const sy = drawable.height * cutFactor;
            const sh = drawable.height * (1.0 - cutFactor);
            const dh = neckH * (1.0 - cutFactor);
            
            ctx.drawImage(
                drawable,
                0, sy, drawable.width, sh,
                -neckW / 2, -neckH / 2 + (neckH * cutFactor),
                neckW, dh
            );
        } else {
            ctx.drawImage(
                drawable,
                -neckW / 2,
                -neckH / 2,
                neckW,
                neckH
            );
        }
        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

        // ---- Animated sparkle shimmer using source-atop (only on gem pixels) ----
        const shimmerAlpha = 0.06 + 0.05 * Math.sin(Date.now() * 0.002);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop'; // only paint over existing opaque pixels
        ctx.globalAlpha = shimmerAlpha;
        ctx.fillStyle = 'rgba(255, 120, 120, 1)'; // Pink/Red ruby light refractions
        ctx.fillRect(-neckW / 2, -neckH / 2, neckW, neckH);
        ctx.restore();
        ctx.globalAlpha = 1.0;

        const isSelected = TryOnState.activeTarget === target;
        const isHovered = TryOnState.hoveredTarget === target;
        if (!TryOnState.imageLocked) {
            const cutFactor = (item.id === 'nexora-necklace-01') ? 0.40 : 0.0;
            const topShift = neckH * cutFactor;
            const visibleH = neckH * (1.0 - cutFactor);
            
            if (isSelected) {
                if (TryOnState.rotationLocked) {
                    ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                    ctx.lineWidth   = 1.25;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeRect(-neckW/2 - 5, -neckH/2 + topShift - 5, neckW + 10, visibleH + 10);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                    ctx.font = '700 8px monospace';
                    ctx.fillText('NECKLACE (ROTATION LOCKED 🔒)', -neckW/2 - 5, -neckH/2 + topShift - 10);
                } else {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                    ctx.lineWidth   = 1.25;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(-neckW/2 - 5, -neckH/2 + topShift - 5, neckW + 10, visibleH + 10);
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#9e7f27';
                    ctx.font = '700 8px monospace';
                    ctx.fillText('NECKLACE (ROTATION UNLOCKED 🔓)', -neckW/2 - 5, -neckH/2 + topShift - 10);
                }
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                ctx.lineWidth   = 1.0;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(-neckW/2 - 5, -neckH/2 + topShift - 5, neckW + 10, visibleH + 10);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                ctx.font = '500 7px monospace';
                ctx.fillText('NECKLACE (HOVER FOR DRAG 👆)', -neckW/2 - 5, -neckH/2 + topShift - 9);
            }
        }
        ctx.restore();
    }

    else if (item.tryonType === 'earrings') {
        // ALWAYS draw BOTH earrings (one per ear).
        // The activeTarget just determines which one shows the selection highlight.
        // ---- Left Earring ----
        if (true) {
            const target = 'left_earring';
            const targetScale = TryOnState.scales[target];
            const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
            const pitchRad = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
            const yawRad = ((TryOnState.yaw[target] || 0) * Math.PI) / 180;
            const coords = getTargetScreenCoords(layoutW, layoutH, target);
            
            let sx, sy, sw, sh;
            if (item.id === 'nexora-jhumka-02') {
                sx = 120; sy = 20; sw = 373; sh = 812;
            } else if (item.id === 'nexora-earrings-03') {
                sx = 100; sy = 310; sw = 350; sh = 600;
            } else {
                sx = 0; sy = 0; sw = drawable.width / 2; sh = drawable.height;
            }
            
            const earringW = baseWidth * 0.14 * targetScale;
            const earringH = earringW * (sh / sw);

            ctx.save();
            ctx.translate(coords.x, coords.y);
            ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
            ctx.rotate(rotationRad);
            ctx.drawImage(drawable, sx, sy, sw, sh, -earringW / 2, -earringH * 0.1, earringW, earringH);
            
            const isSelected = TryOnState.activeTarget === target;
            const isHovered = TryOnState.hoveredTarget === target;
            if (!TryOnState.imageLocked) {
                if (isSelected) {
                    if (TryOnState.rotationLocked) {
                        ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                        ctx.lineWidth = 1.25;
                        ctx.setLineDash([2, 4]);
                        ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                        ctx.setLineDash([]);
                        ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                        ctx.font = '700 7px monospace';
                        ctx.fillText('L-EAR (LOCKED 🔒)', -earringW/2 - 4, -earringH*0.1 - 7);
                    } else {
                        ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                        ctx.lineWidth = 1.25;
                        ctx.setLineDash([4, 4]);
                        ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                        ctx.setLineDash([]);
                        ctx.fillStyle = '#9e7f27';
                        ctx.font = '700 7px monospace';
                        ctx.fillText('L-EAR (UNLOCKED 🔓)', -earringW/2 - 4, -earringH*0.1 - 7);
                    }
                } else if (isHovered) {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([2, 2]);
                    ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                    ctx.font = '500 6px monospace';
                    ctx.fillText('L-EAR (DRAG 👆)', -earringW/2 - 4, -earringH*0.1 - 7);
                }
            }
            ctx.restore();
        }

        // ---- Right Earring ----
        if (true) {
            const target = 'right_earring';
            const targetScale = TryOnState.scales[target];
            const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
            const pitchRad = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
            const yawRad = ((TryOnState.yaw[target] || 0) * Math.PI) / 180;
            const coords = getTargetScreenCoords(layoutW, layoutH, target);
            
            let sx, sy, sw, sh;
            if (item.id === 'nexora-jhumka-02') {
                sx = 550; sy = 20; sw = 370; sh = 811;
            } else if (item.id === 'nexora-earrings-03') {
                sx = 574; sy = 310; sw = 350; sh = 600;
            } else {
                sx = drawable.width / 2; sy = 0; sw = drawable.width / 2; sh = drawable.height;
            }
            
            const earringW = baseWidth * 0.14 * targetScale;
            const earringH = earringW * (sh / sw);

            ctx.save();
            ctx.translate(coords.x, coords.y);
            ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
            ctx.rotate(rotationRad);
            ctx.drawImage(drawable, sx, sy, sw, sh, -earringW / 2, -earringH * 0.1, earringW, earringH);
            
            const isSelected = TryOnState.activeTarget === target;
            const isHovered = TryOnState.hoveredTarget === target;
            if (!TryOnState.imageLocked) {
                if (isSelected) {
                    if (TryOnState.rotationLocked) {
                        ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                        ctx.lineWidth = 1.25;
                        ctx.setLineDash([2, 4]);
                        ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                        ctx.setLineDash([]);
                        ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                        ctx.font = '700 7px monospace';
                        ctx.fillText('R-EAR (LOCKED 🔒)', -earringW/2 - 4, -earringH*0.1 - 7);
                    } else {
                        ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                        ctx.lineWidth = 1.25;
                        ctx.setLineDash([4, 4]);
                        ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                        ctx.setLineDash([]);
                        ctx.fillStyle = '#9e7f27';
                        ctx.font = '700 7px monospace';
                        ctx.fillText('R-EAR (UNLOCKED 🔓)', -earringW/2 - 4, -earringH*0.1 - 7);
                    }
                } else if (isHovered) {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([2, 2]);
                    ctx.strokeRect(-earringW/2 - 4, -earringH*0.1 - 4, earringW + 8, earringH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                    ctx.font = '500 6px monospace';
                    ctx.fillText('R-EAR (DRAG 👆)', -earringW/2 - 4, -earringH*0.1 - 7);
                }
            }
            ctx.restore();
        }
    }
    else if (item.tryonType === 'nosepin') {
        const target = 'nosepin';
        const targetScale = TryOnState.scales[target];
        const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
        const pitchRad = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
        const yawRad = ((TryOnState.yaw[target] || 0) * Math.PI) / 180;
        const coords = getTargetScreenCoords(layoutW, layoutH, target);
        
        const pinW = baseWidth * 0.09 * targetScale;
        const pinH = pinW * (drawable.height / drawable.width);
        
        ctx.save();
        ctx.translate(coords.x, coords.y);
        ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
        ctx.rotate(rotationRad);
        ctx.drawImage(
            drawable,
            -pinW / 2,
            -pinH / 2,
            pinW,
            pinH
        );

        const isSelected = TryOnState.activeTarget === target;
        const isHovered = TryOnState.hoveredTarget === target;
        if (!TryOnState.imageLocked) {
            if (isSelected) {
                if (TryOnState.rotationLocked) {
                    ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeRect(-pinW/2 - 4, -pinH/2 - 4, pinW + 8, pinH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('NOSEPIN (LOCKED 🔒)', -pinW/2 - 4, -pinH/2 - 7);
                } else {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(-pinW/2 - 4, -pinH/2 - 4, pinW + 8, pinH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#9e7f27';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('NOSEPIN (UNLOCKED 🔓)', -pinW/2 - 4, -pinH/2 - 7);
                }
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                ctx.lineWidth = 1.0;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(-pinW/2 - 4, -pinH/2 - 4, pinW + 8, pinH + 8);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                ctx.font = '500 6px monospace';
                ctx.fillText('NOSEPIN (DRAG 👆)', -pinW/2 - 4, -pinH/2 - 7);
            }
        }
        ctx.restore();
    }
    else if (item.tryonType === 'ring') {
        const target = 'ring';
        const targetScale = TryOnState.scales[target];
        const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
        const pitchRad = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
        const yawRad = ((TryOnState.yaw[target] || 0) * Math.PI) / 180;
        const coords = getTargetScreenCoords(layoutW, layoutH, target);
        
        const ringW = baseWidth * 0.25 * targetScale;
        const ringH = ringW * (drawable.height / drawable.width);
        
        ctx.save();
        ctx.translate(coords.x, coords.y);
        ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
        ctx.rotate(rotationRad);
        ctx.drawImage(
            drawable,
            -ringW / 2,
            -ringH / 2,
            ringW,
            ringH
        );

        const isSelected = TryOnState.activeTarget === target;
        const isHovered = TryOnState.hoveredTarget === target;
        if (!TryOnState.imageLocked) {
            if (isSelected) {
                if (TryOnState.rotationLocked) {
                    ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeRect(-ringW/2 - 4, -ringH/2 - 4, ringW + 8, ringH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('RING (LOCKED 🔒)', -ringW/2 - 4, -ringH/2 - 7);
                } else {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(-ringW/2 - 4, -ringH/2 - 4, ringW + 8, ringH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#9e7f27';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('RING (UNLOCKED 🔓)', -ringW/2 - 4, -ringH/2 - 7);
                }
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                ctx.lineWidth = 1.0;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(-ringW/2 - 4, -ringH/2 - 4, ringW + 8, ringH + 8);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                ctx.font = '500 6px monospace';
                ctx.fillText('RING (DRAG 👆)', -ringW/2 - 4, -ringH/2 - 7);
            }
        }
        ctx.restore();
    }
    else {
        // Render generic item on canvas (movable, rotatable, 3D tiltable)
        const target = 'generic';
        const targetScale = TryOnState.scales[target];
        const rotationRad = (TryOnState.rotations[target] * Math.PI) / 180;
        const pitchRad = ((TryOnState.pitch[target] || 0) * Math.PI) / 180;
        const yawRad = ((TryOnState.yaw[target] || 0) * Math.PI) / 180;
        const coords = getTargetScreenCoords(layoutW, layoutH, target);
        
        const itemW = baseWidth * 0.35 * targetScale;
        const itemH = itemW * (drawable.height / drawable.width);
        
        ctx.save();
        ctx.translate(coords.x, coords.y);
        ctx.scale(Math.cos(yawRad), Math.cos(pitchRad));
        ctx.rotate(rotationRad);
        ctx.drawImage(
            drawable,
            -itemW / 2,
            -itemH / 2,
            itemW,
            itemH
        );

        const isSelected = TryOnState.activeTarget === target;
        const isHovered = TryOnState.hoveredTarget === target;
        if (!TryOnState.imageLocked) {
            if (isSelected) {
                if (TryOnState.rotationLocked) {
                    ctx.strokeStyle = 'rgba(112, 26, 184, 0.55)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeRect(-itemW/2 - 4, -itemH/2 - 4, itemW + 8, itemH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(112, 26, 184, 0.85)';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('ITEM (LOCKED 🔒)', -itemW/2 - 4, -itemH/2 - 7);
                } else {
                    ctx.strokeStyle = 'rgba(158, 127, 39, 0.65)';
                    ctx.lineWidth = 1.25;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(-itemW/2 - 4, -itemH/2 - 4, itemW + 8, itemH + 8);
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#9e7f27';
                    ctx.font = '700 7px monospace';
                    ctx.fillText('ITEM (UNLOCKED 🔓)', -itemW/2 - 4, -itemH/2 - 7);
                }
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(158, 127, 39, 0.35)';
                ctx.lineWidth = 1.0;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(-itemW/2 - 4, -itemH/2 - 4, itemW + 8, itemH + 8);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(158, 127, 39, 0.55)';
                ctx.font = '500 6px monospace';
                ctx.fillText('ITEM (DRAG 👆)', -itemW/2 - 4, -itemH/2 - 7);
            }
        }
        ctx.restore();
    }
}

function updateClockTelemetry() {
    const timer = document.querySelector(".telemetry-timer");
    if (!timer) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    timer.innerText = `SYS_TIME: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/* ==========================================
   7. EVENT LISTENERS SYNCING
   ========================================== */
function listenToEvents() {
    window.addEventListener("nexora_select_tryon", (e) => {
        const product = e.detail.product;
        if (!product) return;

        TryOnState.activeItem = product;
        
        const listContainer = document.getElementById("tryon-item-list");
        if (listContainer) {
            listContainer.querySelectorAll(".item-btn").forEach(btn => {
                const id = btn.getAttribute("data-id");
                if (id === product.id) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active"); // Fixed typo from 'b => b' to 'btn'
                }
            });
        }
        updateActiveItemSpecs(product);
        runTelemetryScan();
    });

    window.addEventListener("nexora_auth_change", (e) => {
        const loggedIn = e.detail.loggedIn;
        if (loggedIn) {
            runTelemetryScan();
        }
    });
}
