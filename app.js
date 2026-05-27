/* -------------------------------------------------------------
   NEXORA CORE ORCHESTRATOR (app.js)
   ------------------------------------------------------------- */

// GLOBAL APP STATES
window.NEXORA = {
    loadingComplete: false,
    scrolled: false,
    particles: []
};

let lenis;
document.addEventListener("DOMContentLoaded", () => {
    initPreloader();
    initBackgroundParticles();
    initScrollReveal();
    initHeaderScroll();
    initMobileNav();
    initLenisScroll();
});

function initLenisScroll() {
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            smoothTouch: false
        });
        window.lenis = lenis;

        function scrollLoop(time) {
            lenis.raf(time);
            requestAnimationFrame(scrollLoop);
        }
        requestAnimationFrame(scrollLoop);
        
        // Link anchor clicks to lenis scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    lenis.scrollTo(targetEl);
                }
            });
        });
    }
}

/* ==========================================
   1. PRE-LOADER TIMELINE (DIAMOND EXPLOSION)
   ========================================== */
function initPreloader() {
    const loader = document.getElementById("loader");
    const app = document.getElementById("app");
    const loadingNum = document.getElementById("loading-num");
    const loadingBar = document.querySelector(".loading-bar");
    const statusText = document.querySelector(".loading-status");
    
    const canvas = document.getElementById("loader-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Fit canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Create particles inside preloader (light gold & soft lavender theme)
    const loaderParticles = [];
    for (let i = 0; i < 40; i++) {
        loaderParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 0.6 + Math.random() * 1.4,
            speedY: -0.15 - Math.random() * 0.35,
            speedX: (Math.random() - 0.5) * 0.2,
            alpha: 0.15 + Math.random() * 0.45,
            color: Math.random() > 0.4 ? '#701ab8' : '#9e7f27'
        });
    }

    const statuses = [
        "LOAD MATRIX",
        "ALIGN CRYSTALS",
        "SYNC GEOMETRY",
        "CALIBRATE VIEWPORT",
        "PREPARE HAUTE APPARATUS"
    ];

    let progress = 0;
    
    function animateLoaderCanvas() {
        if (window.NEXORA.loadingComplete) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background dots
        loaderParticles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            
            if (p.y < 0) {
                p.y = canvas.height;
                p.x = Math.random() * canvas.width;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        });
        
        requestAnimationFrame(animateLoaderCanvas);
    }
    requestAnimationFrame(animateLoaderCanvas);

    // Incremental progress loop
    const progressTimer = setInterval(() => {
        progress += Math.floor(Math.random() * 8) + 3;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressTimer);
            triggerLaunch();
        }
        
        loadingNum.innerText = progress;
        loadingBar.style.width = `${progress}%`;
        
        const statusIdx = Math.floor((progress / 100) * statuses.length);
        if (statusIdx < statuses.length) {
            statusText.innerText = statuses[statusIdx];
        }
    }, 30);

    // Launch action triggered on 100%
    function triggerLaunch() {
        window.NEXORA.loadingComplete = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const explosionParticles = [];
        
        for (let i = 0; i < 120; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 8;
            explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: 1 + Math.random() * 2,
                alpha: 1,
                color: Math.random() > 0.4 ? '#701ab8' : '#9e7f27'
            });
        }
        
        let frames = 0;
        function animateExplosion() {
            if (frames > 50) {
                // Smooth lens-blur dissolve begins
                loader.classList.add("fade-out");
                app.classList.remove("hidden");
                
                // Trigger entry reveals in hero section matching lens-blur transition
                setTimeout(() => {
                    document.querySelectorAll("#hero .animate-reveal").forEach(el => {
                        el.classList.add("active");
                    });
                }, 600);
                return;
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            explosionParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.alpha -= 0.02;
                
                if (p.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.alpha;
                    ctx.fill();
                }
            });
            
            frames++;
            requestAnimationFrame(animateExplosion);
        }
        animateExplosion();
    }
}

/* ==========================================
   2. BACKGROUND AMBIENT DUST PARTICLES
   ========================================== */
function initBackgroundParticles() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 25000));
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 0.5 + Math.random() * 1.5,
            baseSpeedY: -0.04 - Math.random() * 0.08,
            baseSpeedX: (Math.random() - 0.5) * 0.05,
            alpha: 0.1 + Math.random() * 0.35,
            color: Math.random() > 0.5 ? '#701ab8' : '#9e7f27',
            pulseSpeed: 0.005 + Math.random() * 0.015,
            pulseDir: 1
        });
    }

    const heroSection = document.getElementById("hero");
    if (heroSection) {
        heroSection.addEventListener("mousemove", (e) => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const moveX = -((e.clientX / width) - 0.5) * 25;
            const moveY = -((e.clientY / height) - 0.5) * 25;
            heroSection.style.backgroundPosition = `calc(50% + ${moveX}px) calc(50% + ${moveY}px)`;
        });
        heroSection.addEventListener("mouseleave", () => {
            heroSection.style.backgroundPosition = "50% 50%";
        });
    }

    function animateBg() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.alpha += p.pulseSpeed * p.pulseDir;
            if (p.alpha >= 0.5 || p.alpha <= 0.08) {
                p.pulseDir *= -1;
            }
            
            p.y += p.baseSpeedY;
            p.x += p.baseSpeedX;
            
            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0.04, Math.min(1, p.alpha));
            ctx.fill();
        });
        
    // Static background parallax handled by mousemove listener above
        
        requestAnimationFrame(animateBg);
    }
    requestAnimationFrame(animateBg);
}

/* ==========================================
   3. SCROLL REVEAL INTERSECT OBSERVERS
   ========================================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll(".story-panel, .feature-card, .testimonial-card, .section-header, .tryon-panel, .tryon-viewport-wrapper");
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Trigger CSS reveal state
                entry.target.classList.add("reveal-active");
                
                // Stagger inline children transitions
                const children = entry.target.querySelectorAll(".story-num, h4, p, .feat-icon, h5, .rating-stars");
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.style.opacity = "1";
                        child.style.transform = "translateY(0) scale(1)";
                        child.style.filter = "blur(0)";
                    }, index * 100);
                });
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => {
        // Setup initial reveal bounds
        const children = el.querySelectorAll(".story-num, h4, p, .feat-icon, h5, .rating-stars");
        children.forEach(child => {
            child.style.opacity = "0";
            child.style.transform = "translateY(25px) scale(0.97)";
            child.style.filter = "blur(6px)";
            child.style.transition = "all 0.9s cubic-bezier(0.215, 0.61, 0.355, 1)";
        });
        
        observer.observe(el);
    });
}

/* ==========================================
   4. HEADER SCROLL STATE CHANGEOVER
   ========================================== */
function initHeaderScroll() {
    const header = document.getElementById("header");
    if (!header) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 40) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
        highlightActiveNavLink();
    });
}

function highlightActiveNavLink() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-link");
    let currentSectionId = "hero";
    
    sections.forEach(section => {
        const top = section.offsetTop - 120;
        const height = section.offsetHeight;
        if (window.scrollY >= top && window.scrollY < top + height) {
            currentSectionId = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${currentSectionId}`) {
            link.classList.add("active");
        }
    });
}

/* ==========================================
   5. MOBILE NAVIGATION DROPDOWN AND TOGGLES
   ========================================== */
function initMobileNav() {
    const toggle = document.getElementById("mobile-toggle");
    const menu = document.getElementById("mobile-menu");
    const links = document.querySelectorAll(".mobile-nav-link");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
        toggle.classList.toggle("active");
        menu.classList.toggle("open");
    });

    links.forEach(link => {
        link.addEventListener("click", () => {
            toggle.classList.remove("active");
            menu.classList.remove("open");
        });
    });
}
