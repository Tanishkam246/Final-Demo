/* -------------------------------------------------------------
   NEXORA MOCK GOOGLE AUTHENTICATION (auth.js)
   ------------------------------------------------------------- */

/* ==========================================
   DOM READY — WIRE UP UI
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    initAuthEngine();
});

function initAuthEngine() {
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const btnLoginTryon   = document.getElementById('btn-login-tryon');
    const btnLoginTryonGate = document.getElementById('btn-login-tryon-gate');
    const btnLogout       = document.getElementById('btn-logout');

    const popupOverlay = document.getElementById('google-auth-popup');
    const btnCancelAuth = document.getElementById('btn-cancel-auth');

    // Intercept Try-On navigation link clicks when not logged in
    const tryonNavLinks = document.querySelectorAll('a[href="#try-on"]');
    tryonNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const savedUser = sessionStorage.getItem('nexora_mock_user');
            if (!savedUser) {
                e.preventDefault();
                openPopupThenSignIn();
            }
        });
    });

    // Header sign-in buttons open the NEXORA branded popup
    if (btnLoginTrigger) {
        btnLoginTrigger.addEventListener('click', () => openPopupThenSignIn());
    }
    if (btnLoginTryon) {
        btnLoginTryon.addEventListener('click', () => openPopupThenSignIn());
    }
    if (btnLoginTryonGate) {
        btnLoginTryonGate.addEventListener('click', () => openPopupThenSignIn());
    }

    // The actual sign-in is triggered by the button inside the popup
    const btnFirebaseSignin = document.getElementById('btn-firebase-signin');
    if (btnFirebaseSignin) {
        btnFirebaseSignin.addEventListener('click', () => startGoogleSignIn());
    }

    // Cancel button just closes overlay (no sign-out needed)
    if (btnCancelAuth) {
        btnCancelAuth.addEventListener('click', () => hidePopup());
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', e => {
            if (e.target === popupOverlay) hidePopup();
        });
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                sessionStorage.removeItem('nexora_mock_user');
                applyLogoutState();
                showToastNotification('Secure session closed.');
            } catch (err) {
                console.error('Sign-out error:', err);
            }
        });
    }

    // Restore login session from sessionStorage on page load
    const savedUser = sessionStorage.getItem('nexora_mock_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            applyLoginState(user);
        } catch (e) {
            console.error('Failed to restore mock user session:', e);
            applyLogoutState();
        }
    } else {
        applyLogoutState();
    }
}

/* ==========================================
   SHOW POPUP (branded overlay before mock sign-in)
   ========================================== */
function openPopupThenSignIn() {
    const popupOverlay = document.getElementById('google-auth-popup');
    if (popupOverlay) {
        popupOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Reset button state in case it was previously loading
        const btn = document.getElementById('btn-firebase-signin');
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Continue with Google</span>`;
            btn.disabled = false;
        }
    }
}

/* ==========================================
   SIMULATED GOOGLE SIGN-IN FLOW
   ========================================== */
async function startGoogleSignIn() {
    const btn = document.getElementById('btn-firebase-signin');
    if (btn) {
        btn.innerHTML = `<span class="auth-spinning" style="font-size:1.1rem">⟳</span><span>Connecting…</span>`;
        btn.disabled = true;
    }

    // Simulate network delay for premium feel
    setTimeout(() => {
        const mockUser = {
            name: "Tanishka Sharma",
            email: "tanishkam2006@gmail.com",
            photo: "", // will trigger initials fallback
            uid: "mock-uid-12345"
        };

        // Persist to sessionStorage for page-reload support
        sessionStorage.setItem('nexora_mock_user', JSON.stringify(mockUser));

        // Apply state and close popup
        applyLoginState(mockUser);
        hidePopup();
        showToastNotification(`Welcome, Tanishka!`);
    }, 1200);
}

function hidePopup() {
    const popupOverlay = document.getElementById('google-auth-popup');
    if (popupOverlay) popupOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

/* ==========================================
   STATE APPLIERS
   ========================================== */
function applyLoginState(user) {
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const userProfile     = document.getElementById('user-profile');
    const userImg         = document.getElementById('user-img');
    const userName        = document.getElementById('user-name');
    const tryonGate       = document.getElementById('tryon-gate');

    // Google icon OUT, profile IN
    if (btnLoginTrigger) btnLoginTrigger.style.display = 'none';
    if (userProfile)     userProfile.style.display = 'flex';

    if (userImg) {
        userImg.style.display = '';
        userImg.src = user.photo || '';
        userImg.onerror = () => {
            userImg.style.display = 'none';
            const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const parent = userImg.parentElement;
            // Clean up old fallback elements if any
            const existingFallback = parent.querySelector('.fallback-avatar');
            if (existingFallback) {
                existingFallback.remove();
            }
            const fb = document.createElement('div');
            fb.className = 'fallback-avatar';
            fb.textContent = initials;
            fb.style.cssText = 'width:32px;height:32px;border-radius:50%;background:var(--royal-purple);display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#fff;font-weight:700;flex-shrink:0;';
            parent.insertBefore(fb, userImg);
        };
        // Trigger error handler to show initials fallback if photo is empty
        if (!user.photo) {
            userImg.onerror();
        }
    }
    if (userName) userName.innerText = user.name?.split(' ')[0] || 'User';

    // Unlock try-on gate immediately
    if (tryonGate) tryonGate.style.display = 'none';

    // Hide logged-out view and show tryon container
    const tryonSection = document.getElementById('try-on');
    const loggedOutView = document.getElementById('tryon-logged-out-view');
    const tryonContainer = document.getElementById('tryon-container');
    
    if (tryonSection) tryonSection.classList.remove('hidden');
    if (loggedOutView) loggedOutView.classList.add('hidden');
    if (tryonContainer) tryonContainer.classList.remove('hidden');

    // Handle pending try-on product from showroom
    if (window.NEXORA?.pendingTryOnProduct) {
        const pendingProd = window.NEXORA.pendingTryOnProduct;
        window.NEXORA.pendingTryOnProduct = null;
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nexora_select_tryon', { detail: { product: pendingProd } }));
            // Smoothly scroll to the try-on section now that it's visible
            if (tryonSection) {
                tryonSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 600);
    }

    window.dispatchEvent(new CustomEvent('nexora_auth_change', { detail: { loggedIn: true, user } }));
}

function applyLogoutState() {
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const userProfile     = document.getElementById('user-profile');
    const tryonGate       = document.getElementById('tryon-gate');

    // Profile OUT, Google icon IN
    if (userProfile)     userProfile.style.display = 'none';
    if (btnLoginTrigger) btnLoginTrigger.style.display = 'flex';

    // Re-lock try-on gate
    if (tryonGate) tryonGate.style.display = '';
    if (tryonGate) tryonGate.classList.remove('hidden');

    // Show logged-out view and hide tryon container inside Try-On section
    const loggedOutView = document.getElementById('tryon-logged-out-view');
    const tryonContainer = document.getElementById('tryon-container');
    if (loggedOutView) loggedOutView.classList.remove('hidden');
    if (tryonContainer) tryonContainer.classList.add('hidden');

    // Reset rotation lock state
    if (window.toggleRotationLock) {
        window.toggleRotationLock(false);
    }

    window.dispatchEvent(new CustomEvent('nexora_auth_change', { detail: { loggedIn: false } }));
}

/* ==========================================
   GLOBAL TOAST HELPER
   ========================================== */
export function showToastNotification(message) {
    const banner = document.getElementById('notification-banner');
    const msg    = document.getElementById('notification-message');
    if (!banner || !msg) return;

    msg.innerText = message;
    banner.classList.remove('hidden');

    setTimeout(() => banner.classList.add('hidden'), 3000);
}

window.showToastNotification = showToastNotification;
window.openPopupThenSignIn = openPopupThenSignIn;
