/**
 * Language Switcher Component
 * Displays language selection dropdown in top-right corner
 */

class LanguageSwitcher {
    constructor() {
        this.init();
    }

    init() {
        // Subscribe to language changes
        window.i18n.subscribe((lang) => {
            this.updateUI(lang);
        });

        // Initial UI update
        this.updateUI(window.i18n.getLanguage());
    }

    /**
     * Render language switcher button
     */
    render() {
        const currentLang = window.i18n.getLanguage();
        const flagEmoji = currentLang === 'de' ? '🇩🇪' : '🇬🇧';
        const langName = currentLang === 'de' ? 'DE' : 'EN';

        return `
            <div class="dropdown">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center gap-2"
                        type="button"
                        id="languageDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                    <span style="font-size: 1.2rem;">${flagEmoji}</span>
                    <span>${langName}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="languageDropdown">
                    <li>
                        <a class="dropdown-item ${currentLang === 'de' ? 'active' : ''}"
                           href="#"
                           onclick="LanguageSwitcher.switchLanguage('de'); return false;">
                            <span class="me-2">🇩🇪</span>
                            Deutsch
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item ${currentLang === 'en' ? 'active' : ''}"
                           href="#"
                           onclick="LanguageSwitcher.switchLanguage('en'); return false;">
                            <span class="me-2">🇬🇧</span>
                            English
                        </a>
                    </li>
                </ul>
            </div>
        `;
    }

    /**
     * Switch language
     */
    static switchLanguage(lang) {
        window.i18n.setLanguage(lang);
    }

    /**
     * Update UI when language changes
     */
    updateUI(lang) {
        // Re-render language switcher
        const container = document.getElementById('languageSwitcherContainer');
        if (container) {
            container.innerHTML = this.render();
        }

        // Trigger global UI update
        this.updateAllTexts();
    }

    /**
     * Update all translatable texts in the UI
     */
    updateAllTexts() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = element.getAttribute('data-i18n-params');

            let text = window.i18n.t(key);

            if (params) {
                try {
                    const paramsObj = JSON.parse(params);
                    text = window.i18n.t(key, paramsObj);
                } catch (e) {
                    console.error('Error parsing i18n params:', e);
                }
            }

            // Update text content or placeholder
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = text;
                }
            } else {
                element.textContent = text;
            }
        });

        // Update elements with data-i18n-html attribute (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = window.i18n.t(key);
        });

        // Update tooltips
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = window.i18n.t(key);
        });

        // Re-render components that need language update
        if (window.PVListRenderer) {
            window.PVListRenderer.render();
        }

        if (window.CornerDetailsManager && window.CornerDetailsManager.currentPVId) {
            window.CornerDetailsManager.render();
        }
    }
}

// Create global instance
window.LanguageSwitcher = new LanguageSwitcher();
