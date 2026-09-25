// js/analytics.js
// Google Analytics 4 — replace G-XXXXXXXXXX with your Measurement ID

const GA_ID = "G-SLBLSDGJRC";  // ⬅️ REPLACE WITH YOUR ID FROM STEP 6

// Load gtag.js
(function loadGA() {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, {
        send_page_view: true,
        anonymize_ip: true
    });
})();

// Public helper to log custom events
export function trackEvent(eventName, params = {}) {
    if (window.gtag) window.gtag('event', eventName, params);
}

// Auto-track common actions
document.addEventListener('DOMContentLoaded', () => {
    // Track clicks on Book Now buttons
    document.querySelectorAll('a[href="#booking"], a[href*="wa.me"]').forEach(el => {
        el.addEventListener('click', () => {
            const isWhatsApp = el.href.includes('wa.me');
            trackEvent(isWhatsApp ? 'whatsapp_click' : 'book_now_click', {
                location: el.closest('section')?.id || 'unknown'
            });
        });
    });

    // Track gallery filter clicks
    document.querySelectorAll('.gallery-filter').forEach(el => {
        el.addEventListener('click', () => {
            trackEvent('gallery_filter', { filter: el.dataset.filter });
        });
    });

    // Track language switches
    const langSwitcher = document.getElementById('langSwitcher');
    if (langSwitcher) {
        langSwitcher.addEventListener('change', (e) => {
            trackEvent('language_switch', { language: e.target.value });
        });
    }
});
