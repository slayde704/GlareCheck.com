/**
 * UI Manager Module
 * Handles all UI interactions including panels, modals, and messages
 */

// Helper function to access i18n
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;

export const UIManager = {
    /**
     * Show a message using Bootstrap modal
     * @param {string} message - The message to display
     * @param {string} title - Modal title (default: translated 'Info')
     */
    showMessage(message, title = null) {
        // Use existing modal from the DOM
        const modal = document.getElementById('messageModal');
        if (!modal) {
            console.error('Message modal not found in DOM');
            return;
        }

        // Update content
        const modalTitle = document.getElementById('messageModalLabel');
        const modalBody = document.getElementById('messageModalBody');
        const modalFooter = modal.querySelector('.modal-footer');

        if (modalTitle) modalTitle.textContent = title || t('common.info');
        if (modalBody) modalBody.innerHTML = message;

        // Hide footer if message contains custom buttons (like in delete dialog)
        if (modalFooter) {
            const hasCustomButtons = message.includes('<button');
            modalFooter.style.display = hasCustomButtons ? 'none' : 'flex';
        }

        // Close any open modals first
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(openModal => {
            const instance = bootstrap.Modal.getInstance(openModal);
            if (instance) instance.hide();
        });

        // Show modal after a small delay to allow previous modals to close
        setTimeout(() => {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }, 100);
    },

    /**
     * Switch to a specific panel
     * @param {string} panelName - Name of the panel to show
     */
    showPanel(panelName) {
        const targetPanel = document.getElementById(`panel-${panelName}`);

        if (!targetPanel) {
            console.warn('Panel not found:', panelName);
            return;
        }

        // Hide all panels
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show target panel
        targetPanel.classList.add('active');

        // Update menu state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-panel') === panelName) {
                item.classList.add('active');
            }
        });

        // Collapse menu when showing a panel
        const menuSection = document.getElementById('menu-section');
        if (menuSection) {
            menuSection.classList.add('collapsed');
        }
    },

    /**
     * Return to main menu with slide animation
     */
    backToMenu() {
        const activePanel = document.querySelector('.content-panel.active');
        const menuSection = document.getElementById('menu-section');

        // Add sliding-out animation to active panel
        if (activePanel) {
            activePanel.classList.add('sliding-out');
            activePanel.classList.remove('active');

            // Remove panel after animation completes
            setTimeout(() => {
                activePanel.classList.remove('sliding-out');
            }, 300);
        }

        // Show menu again
        if (menuSection) {
            menuSection.classList.remove('collapsed');
        }

        // Clear active menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
    },

    /**
     * Toggle PV area details visibility with smooth animation
     * @param {string} pvId - ID of the PV area
     */
    togglePVDetails(pvId) {
        const details = document.getElementById(`details-${pvId}`);
        const chevron = document.getElementById(`chevron-${pvId}`);
        const pvItem = document.getElementById(`pv-item-${pvId}`);

        if (details && chevron) {
            const isExpanded = details.classList.contains('expanded');

            if (isExpanded) {
                // Collapse with animation
                details.style.maxHeight = details.scrollHeight + 'px';
                details.offsetHeight; // Force reflow
                details.style.maxHeight = '0';

                setTimeout(() => {
                    details.classList.remove('expanded');
                    details.style.maxHeight = '';
                }, 300);

                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-right');
                if (pvItem) {
                    pvItem.classList.remove('has-expanded-details');
                }
            } else {
                // Expand with animation
                details.classList.add('expanded');
                details.style.maxHeight = '0';
                details.offsetHeight; // Force reflow
                details.style.maxHeight = details.scrollHeight + 'px';

                setTimeout(() => {
                    details.style.maxHeight = '';
                }, 300);

                chevron.classList.remove('fa-chevron-right');
                chevron.classList.add('fa-chevron-down');
                if (pvItem) {
                    pvItem.classList.add('has-expanded-details');
                }
            }
        }
    },

    /**
     * Initialize UI event handlers
     */
    initializeUI() {
        // Menu item click handlers
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const panel = item.getAttribute('data-panel');
                if (panel) {
                    console.log('Switching to panel:', panel);
                    this.showPanel(panel);
                }
            });
        });

        // Back button handler
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Back to menu');
                this.backToMenu();
            });
        }

        // Don't show default hint on initialization - let menu be visible
    },

    /**
     * Show/hide loading spinner
     * @param {boolean} show - Whether to show or hide the spinner
     * @param {string} message - Optional loading message
     */
    showLoading(show, message = null) {
        const defaultMessage = message || t('common.loading');
        let spinner = document.getElementById('loadingSpinner');

        if (show) {
            if (!spinner) {
                const spinnerHtml = `
                    <div id="loadingSpinner" class="position-fixed top-50 start-50 translate-middle" style="z-index: 9999;">
                        <div class="text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div class="mt-2 text-primary fw-bold" id="loadingMessage">${defaultMessage}</div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', spinnerHtml);
            } else {
                spinner.style.display = 'block';
                const messageEl = document.getElementById('loadingMessage');
                if (messageEl) {
                    messageEl.textContent = defaultMessage;
                }
            }
        } else {
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    },

    /**
     * Update a specific element's content
     * @param {string} elementId - ID of the element to update
     * @param {string} content - HTML content to insert
     */
    updateElement(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
        }
    },

    /**
     * Show/hide an element
     * @param {string} elementId - ID of the element
     * @param {boolean} show - Whether to show or hide
     */
    toggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    },

    /**
     * Add a class to an element
     * @param {string} elementId - ID of the element
     * @param {string} className - Class to add
     */
    addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    },

    /**
     * Remove a class from an element
     * @param {string} elementId - ID of the element
     * @param {string} className - Class to remove
     */
    removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    },

    /**
     * Show a notification toast
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     */
    showNotification(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Map type to Bootstrap class
        const typeClass = {
            'success': 'bg-success text-white',
            'error': 'bg-danger text-white',
            'warning': 'bg-warning text-dark',
            'info': 'bg-info text-white'
        }[type] || 'bg-secondary text-white';

        // Create toast
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast ${typeClass}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${typeClass}">
                    <strong class="me-auto">${t('common.' + type)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        // Show toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
};

// For backward compatibility, also export individual functions
export const {
    showMessage,
    showPanel,
    backToMenu,
    togglePVDetails,
    initializeUI,
    showLoading,
    updateElement,
    toggleElement,
    addClass,
    removeClass,
    showNotification
} = UIManager;
