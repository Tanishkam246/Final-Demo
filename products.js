/* -------------------------------------------------------------
   NEXORA PRODUCT CATALOG & CART ENGINE (products.js)
   ------------------------------------------------------------- */

// JEWELRY CATALOG LIST
const JEWELRY_CATALOG = [
    {
        id: "nexora-necklace-01",
        name: "Imperial Ruby Tennis Collar",
        category: "Ruby Necklaces",
        price: 215000,
        image: "assets/ruby_necklace_3d.png",
        desc: "A perfect circular ruby tennis necklace featuring 48 round brilliant-cut Burmese rubies set in 18K white gold prongs, forming an unbroken circle of pure crimson radiance. The pinnacle of effortless luxury.",
        stone: "Vivid Red Burmese Rubies — 48 Stones",
        carat: "24.8 Ct",
        metal: "18K White Gold",
        tryonType: "necklace",
        polygons: "186,400 Triangles",
        vertices: "95,300 Vertices",
        fileSize: "5.4 MB",
        format: "GLTF/GLB 3D Asset"
    },
    {
        id: "nexora-jhumka-02",
        name: "Imperial Emerald Jhumkas",
        category: "Royal Jhumkas",
        price: 145000,
        image: "assets/royal_jhumkas.png",
        desc: "An ornate pair of traditional royal earrings encrusted with custom-cut emeralds and surrounding brilliant-cut diamond grids. Captures historic grandeur with modern balance mechanics.",
        stone: "Zambian Emeralds & VVS1 Diamonds",
        carat: "12.8 Ct Total",
        metal: "22K Solid Gold",
        tryonType: "earrings",
        polygons: "220,100 Triangles",
        vertices: "112,600 Vertices",
        fileSize: "6.8 MB",
        format: "GLTF/GLB 3D Asset"
    },
    {
        id: "nexora-earrings-03",
        name: "Marquise Cascade Studs",
        category: "Elegant Earrings",
        price: 98000,
        image: "assets/diamond_earrings.png",
        desc: "A dual drop platinum earring set displaying clean marquise cuts that fall with natural gravity curves. Ideal for high-profile previews and red carpet styling.",
        stone: "D-Flawless Diamonds",
        carat: "6.2 Ct Pair",
        metal: "Platinum 950",
        tryonType: "earrings",
        polygons: "94,800 Triangles",
        vertices: "48,900 Vertices",
        fileSize: "2.9 MB",
        format: "GLTF/GLB 3D Asset"
    },
    {
        id: "nexora-ring-04",
        name: "Aura Solitaire Set",
        category: "Wedding Collections",
        price: 75000,
        image: "assets/wedding_rings.png",
        desc: "An exceptional wedding ring set comprising a flawless 4-carat emerald-cut solitaire ring coupled with an interlocking micro-pave gold diamond band.",
        stone: "Ideal Cut Solitaires",
        carat: "5.5 Ct Total",
        metal: "18K Yellow Gold & Platinum",
        tryonType: "ring",
        polygons: "135,200 Triangles",
        vertices: "69,400 Vertices",
        fileSize: "4.1 MB",
        format: "GLTF/GLB 3D Asset"
    },
    {
        id: "nexora-nosepin-05",
        name: "Aurelia Septum Pin",
        category: "Nose Pins",
        price: 34000,
        image: "assets/gold_nosepin.png",
        desc: "An exquisite micro-septum nose ring showcasing a single bezel-set marquise emerald supported by a curved micro-pave gold diamond band.",
        stone: "Marquise Emerald & Round Diamonds",
        carat: "1.8 Ct Total",
        metal: "18K Yellow Gold",
        tryonType: "nosepin",
        polygons: "68,400 Triangles",
        vertices: "35,100 Vertices",
        fileSize: "1.8 MB",
        format: "GLTF/GLB 3D Asset"
    }
];

// USER PERSISTENT STORAGE
let CoutureBag = JSON.parse(localStorage.getItem("nexora_bag")) || [];
let Wishlist = JSON.parse(localStorage.getItem("nexora_wishlist")) || [];

document.addEventListener("DOMContentLoaded", () => {
    renderShowcase();
    initDrawers();
    initModalEvents();
    syncCounts();
});

/* ==========================================
   1. RENDER CATALOG CARDS IN SHOWROOM
   ========================================== */
function renderShowcase() {
    const listContainer = document.getElementById("product-list");
    if (!listContainer) return;

    listContainer.innerHTML = JEWELRY_CATALOG.map(prod => {
        const inWish = Wishlist.some(w => w.id === prod.id);
        const inWishClass = inWish ? "active" : "";
        
        return `
            <div class="product-card glass-panel" data-id="${prod.id}">
                <div class="card-top">
                    <span class="card-badge">${prod.category}</span>
                    <button class="btn-wishlist ${inWishClass}" aria-label="Add to Wishlist">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                </div>
                
                <div class="card-visual">
                    <div class="card-glow"></div>
                    <img src="${prod.image}" alt="${prod.name}" class="card-jewelry-img" />
                </div>

                <div class="card-info">
                    <div class="card-3d-badge" style="font-size: 0.65rem; color: var(--gold-glow); background: rgba(212, 175, 55, 0.06); border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 20px; padding: 2px 8px; width: fit-content; margin-bottom: 0.4rem; letter-spacing: 0.05em; font-family: 'Outfit', sans-serif; text-transform: uppercase; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--gold-glow); display: inline-block; animation: pulse 2s infinite;"></span>
                        3D Asset • ${prod.fileSize}
                    </div>
                    <h4 class="card-title">${prod.name}</h4>
                    <p class="card-desc">${prod.desc}</p>
                </div>

                <div class="card-bottom">
                    <span class="card-price">$${prod.price.toLocaleString()}</span>
                    <div class="card-actions">
                        <button class="btn-card-action btn-add-bag">Bag</button>
                        <button class="btn-card-action btn-try">Try-On</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Add drag-to-scroll features for the horizontal container
    let isDown = false;
    let startX;
    let scrollLeft;
    
    listContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; // Ignore click targets
        isDown = true;
        startX = e.pageX - listContainer.offsetLeft;
        scrollLeft = listContainer.scrollLeft;
    });
    
    listContainer.addEventListener('mouseleave', () => {
        isDown = false;
    });
    
    listContainer.addEventListener('mouseup', () => {
        isDown = false;
    });
    
    listContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - listContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        listContainer.scrollLeft = scrollLeft - walk;
    });

    // Add specific action listeners on cards
    document.querySelectorAll(".product-card").forEach(card => {
        const id = card.getAttribute("data-id");
        const prod = JEWELRY_CATALOG.find(p => p.id === id);

        card.addEventListener("click", (e) => {
            if (!e.target.closest("button")) {
                openProductModal(prod);
            }
        });

        card.querySelector(".btn-wishlist").addEventListener("click", (e) => {
            e.stopPropagation();
            toggleWishlist(prod);
            card.querySelector(".btn-wishlist").classList.toggle("active");
        });

        card.querySelector(".btn-add-bag").addEventListener("click", (e) => {
            e.stopPropagation();
            addToBag(prod);
        });

        card.querySelector(".btn-try").addEventListener("click", (e) => {
            e.stopPropagation();
            const tryOnSection = document.getElementById("try-on");
            if (tryOnSection) {
                const isLocked = !sessionStorage.getItem('nexora_mock_user');
                if (isLocked) {
                    if (window.NEXORA) {
                        window.NEXORA.pendingTryOnProduct = prod;
                    }
                    if (window.openPopupThenSignIn) {
                        window.openPopupThenSignIn();
                    }
                } else {
                    tryOnSection.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("nexora_select_tryon", { detail: { product: prod } }));
                    }, 600);
                }
            }
        });
    });
}

/* ==========================================
   2. WISHLIST & CART STORAGE MANAGEMENT
   ========================================== */
function addToBag(product) {
    const exists = CoutureBag.some(item => item.id === product.id);
    if (!exists) {
        CoutureBag.push(product);
        localStorage.setItem("nexora_bag", JSON.stringify(CoutureBag));
        syncCounts();
        window.showToastNotification(`${product.name} added to Couture Bag`);
    } else {
        window.showToastNotification(`Item already in Couture Bag`);
    }
    renderCartDrawer();
}

function removeFromBag(productId) {
    CoutureBag = CoutureBag.filter(item => item.id !== productId);
    localStorage.setItem("nexora_bag", JSON.stringify(CoutureBag));
    syncCounts();
    renderCartDrawer();
}

function toggleWishlist(product) {
    const idx = Wishlist.findIndex(item => item.id === product.id);
    if (idx === -1) {
        Wishlist.push(product);
        window.showToastNotification(`${product.name} added to Wishlist`);
    } else {
        Wishlist.splice(idx, 1);
        window.showToastNotification(`Removed from Wishlist`);
    }
    localStorage.setItem("nexora_wishlist", JSON.stringify(Wishlist));
    syncCounts();
    renderWishlistDrawer();
}

function syncCounts() {
    const cartCount = document.getElementById("cart-count");
    const wishlistCount = document.getElementById("wishlist-count");
    
    if (cartCount) cartCount.innerText = CoutureBag.length;
    if (wishlistCount) wishlistCount.innerText = Wishlist.length;
}

/* ==========================================
   3. DRAWERS / FLYOUT CONTROLLERS
   ========================================== */
function initDrawers() {
    const cartToggle = document.getElementById("cart-toggle");
    const cartClose = document.getElementById("cart-close-btn");
    const cartDrawer = document.getElementById("cart-drawer");

    const wishToggle = document.getElementById("wishlist-toggle");
    const wishClose = document.getElementById("wishlist-close-btn");
    const wishDrawer = document.getElementById("wishlist-drawer");

    if (cartToggle) {
        cartToggle.addEventListener("click", () => {
            cartDrawer.classList.remove("hidden");
            renderCartDrawer();
        });
    }
    if (cartClose) {
        cartClose.addEventListener("click", () => cartDrawer.classList.add("hidden"));
    }
    if (cartDrawer) {
        cartDrawer.addEventListener("click", (e) => {
            if (e.target === cartDrawer) cartDrawer.classList.add("hidden");
        });
    }

    if (wishToggle) {
        wishToggle.addEventListener("click", () => {
            wishDrawer.classList.remove("hidden");
            renderWishlistDrawer();
        });
    }
    if (wishClose) {
        wishClose.addEventListener("click", () => wishDrawer.classList.add("hidden"));
    }
    if (wishDrawer) {
        wishDrawer.addEventListener("click", (e) => {
            if (e.target === wishDrawer) wishDrawer.classList.add("hidden");
        });
    }

    const btnCheckout = document.getElementById("btn-checkout");
    if (btnCheckout) {
        btnCheckout.addEventListener("click", () => {
            if (CoutureBag.length === 0) {
                window.showToastNotification("Couture Bag is empty");
                return;
            }
            window.showToastNotification("Procurement channels initialized. Contacting concierge.");
            setTimeout(() => {
                window.showToastNotification("Your dedicated NEXORA assistant will contact you shortly.");
                CoutureBag = [];
                localStorage.removeItem("nexora_bag");
                syncCounts();
                renderCartDrawer();
                cartDrawer.classList.add("hidden");
            }, 2000);
        });
    }
}

function renderCartDrawer() {
    const container = document.getElementById("cart-items-container");
    const subtotalText = document.getElementById("cart-subtotal");
    if (!container) return;

    if (CoutureBag.length === 0) {
        container.innerHTML = `<div class="drawer-empty-msg">Your Bag is empty</div>`;
        if (subtotalText) subtotalText.innerText = "$0";
        return;
    }

    let subtotal = 0;
    container.innerHTML = CoutureBag.map(item => {
        subtotal += item.price;
        return `
            <div class="drawer-item">
                <img src="${item.image}" alt="${item.name}" class="drawer-item-img" />
                <div class="drawer-item-details">
                    <span class="drawer-item-name">${item.name}</span>
                    <span class="drawer-item-price">$${item.price.toLocaleString()}</span>
                </div>
                <button class="btn-remove-item" data-id="${item.id}" aria-label="Remove item">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `;
    }).join("");

    if (subtotalText) subtotalText.innerText = `$${subtotal.toLocaleString()}`;

    container.querySelectorAll(".btn-remove-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            removeFromBag(id);
        });
    });
}

function renderWishlistDrawer() {
    const container = document.getElementById("wishlist-items-container");
    if (!container) return;

    if (Wishlist.length === 0) {
        container.innerHTML = `<div class="drawer-empty-msg">Your Wishlist is empty</div>`;
        return;
    }

    container.innerHTML = Wishlist.map(item => {
        return `
            <div class="drawer-item">
                <img src="${item.image}" alt="${item.name}" class="drawer-item-img" />
                <div class="drawer-item-details">
                    <span class="drawer-item-name">${item.name}</span>
                    <span class="drawer-item-price">$${item.price.toLocaleString()}</span>
                </div>
                <button class="btn-remove-item" data-id="${item.id}" aria-label="Remove item" style="color: var(--gold-glow)">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".btn-remove-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            const prod = JEWELRY_CATALOG.find(p => p.id === id);
            toggleWishlist(prod);
            renderShowcase();
        });
    });
}

/* ==========================================
   4. FULLSCREEN PRODUCT DETAIL MODAL
   ========================================== */
let activeSparkleLoop = null;

function initModalEvents() {
    const modal = document.getElementById("product-modal");
    const closeBtn = modal.querySelector(".modal-close-btn");
    
    if (closeBtn) {
        closeBtn.addEventListener("click", () => closeModal());
    }
    
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

function openProductModal(product) {
    const modal = document.getElementById("product-modal");
    if (!modal) return;

    document.getElementById("modal-product-img").src = product.image;
    document.getElementById("modal-product-name").innerText = product.name;
    document.getElementById("modal-product-price").innerText = `$${product.price.toLocaleString()}`;
    document.getElementById("modal-product-desc").innerText = product.desc;
    document.getElementById("modal-product-stone").innerText = product.stone;
    document.getElementById("modal-product-carat").innerText = product.carat;
    document.getElementById("modal-product-metal").innerText = product.metal;

    // Populate 3D Asset Spec details
    if (document.getElementById("modal-3d-format")) {
        document.getElementById("modal-3d-format").innerText = product.format || "GLTF/GLB 3D Asset";
        document.getElementById("modal-3d-size").innerText = product.fileSize || "4.8 MB";
        document.getElementById("modal-3d-polys").innerText = product.polygons || "180K Polys";
        document.getElementById("modal-3d-verts").innerText = product.vertices || "90K Verts";
    }

    const btnBuy = document.getElementById("modal-btn-buy");
    const btnTry = document.getElementById("modal-btn-tryon");
    
    btnBuy.replaceWith(btnBuy.cloneNode(true));
    btnTry.replaceWith(btnTry.cloneNode(true));
    
    document.getElementById("modal-btn-buy").addEventListener("click", () => {
        addToBag(product);
        closeModal();
    });

    document.getElementById("modal-btn-tryon").addEventListener("click", () => {
        closeModal();
        const tryOnSection = document.getElementById("try-on");
        if (tryOnSection) {
            const isLocked = !sessionStorage.getItem('nexora_mock_user');
            if (isLocked) {
                if (window.NEXORA) {
                    window.NEXORA.pendingTryOnProduct = product;
                }
                if (window.openPopupThenSignIn) {
                    window.openPopupThenSignIn();
                }
            } else {
                tryOnSection.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("nexora_select_tryon", { detail: { product } }));
                }, 600);
            }
        }
    });

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    startModalSparkles();
}

function closeModal() {
    const modal = document.getElementById("product-modal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
    
    if (activeSparkleLoop) {
        cancelAnimationFrame(activeSparkleLoop);
        activeSparkleLoop = null;
    }
}

function startModalSparkles() {
    const canvas = document.getElementById("modal-sparkle-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const sparkles = [];
    
    function drawSparkle(x, y, size, rotation, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.fillStyle = '#b59438';
        ctx.globalAlpha = alpha;
        
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, size);
            ctx.lineTo(size * 0.2, size * 0.2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function updateSparkles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Math.random() < 0.1 && sparkles.length < 12) {
            sparkles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 120,
                y: canvas.height / 2 + (Math.random() - 0.5) * 120,
                size: 2.5 + Math.random() * 6,
                rotation: Math.random() * Math.PI,
                rotationSpeed: (Math.random() - 0.5) * 0.04,
                alpha: 0,
                fadeDir: 1,
                fadeSpeed: 0.015 + Math.random() * 0.02
            });
        }

        sparkles.forEach((s, idx) => {
            s.alpha += s.fadeSpeed * s.fadeDir;
            s.rotation += s.rotationSpeed;
            
            if (s.alpha >= 0.95) {
                s.alpha = 0.95;
                s.fadeDir = -1;
            }
            
            if (s.alpha <= 0 && s.fadeDir === -1) {
                sparkles.splice(idx, 1);
                return;
            }

            drawSparkle(s.x, s.y, s.size, s.rotation, s.alpha);
        });

        activeSparkleLoop = requestAnimationFrame(updateSparkles);
    }
    updateSparkles();
}

export { JEWELRY_CATALOG };
