/**
 * @fileoverview Utility functions for the Glare Check application
 * @module utils
 * @requires None
 */

/**
 * Parses a German number format (comma as decimal separator) to a float
 * @param {string} str - The string to parse (e.g., "45,5" or "45.5")
 * @returns {number} The parsed float value
 * @example
 * parseGermanNumber("45,5") // returns 45.5
 * parseGermanNumber("45.5") // returns 45.5
 * parseGermanNumber("1.234,56") // returns 1234.56
 */
function parseGermanNumber(str) {
    if (!str) return 0;
    // Replace comma with dot for parsing
    // Remove thousand separators (dots followed by 3 digits)
    return parseFloat(str.toString().replace(/\.(?=\d{3})/g, '').replace(',', '.'));
}

/**
 * Formats a number to German format with comma as decimal separator
 * @param {number} num - The number to format
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} The formatted number string
 * @example
 * formatGermanNumber(45.5) // returns "45,5"
 * formatGermanNumber(1234.56) // returns "1.234,56"
 */
function formatGermanNumber(num, decimals = 2) {
    return num.toLocaleString('de-DE', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

/**
 * Generates a unique ID for entities
 * @param {string} [prefix=''] - Optional prefix for the ID
 * @returns {string} A unique identifier
 * @example
 * generateId() // returns "1234567890123"
 * generateId('pv') // returns "pv_1234567890123"
 */
function generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 * @example
 * degreesToRadians(180) // returns Math.PI
 * degreesToRadians(90) // returns Math.PI/2
 */
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 * @example
 * radiansToDegrees(Math.PI) // returns 180
 * radiansToDegrees(Math.PI/2) // returns 90
 */
function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Normalizes an angle to be between 0 and 360 degrees
 * @param {number} angle - The angle in degrees
 * @returns {number} Normalized angle between 0 and 360
 * @example
 * normalizeAngle(370) // returns 10
 * normalizeAngle(-10) // returns 350
 * normalizeAngle(720) // returns 0
 */
function normalizeAngle(angle) {
    angle = angle % 360;
    if (angle < 0) {
        angle += 360;
    }
    return angle;
}

/**
 * Calculates the distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between the points
 * @example
 * calculateDistance(0, 0, 3, 4) // returns 5
 */
function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 * @example
 * const original = {a: 1, b: {c: 2}};
 * const cloned = deepClone(original);
 * cloned.b.c = 3; // original.b.c is still 2
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 * @example
 * const debouncedSave = debounce(saveData, 500);
 * debouncedSave(); // Will only execute after 500ms of no calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validates if a value is a number and within range
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if valid, false otherwise
 * @example
 * isValidNumber(45, 0, 90) // returns true
 * isValidNumber(100, 0, 90) // returns false
 * isValidNumber("abc", 0, 90) // returns false
 */
function isValidNumber(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

/**
 * Gets the compass direction from an azimuth angle
 * @param {number} azimuth - Azimuth angle in degrees (0-360)
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 * @example
 * getCompassDirection(0) // returns "N"
 * getCompassDirection(45) // returns "NE"
 * getCompassDirection(180) // returns "S"
 */
function getCompassDirection(azimuth) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalizeAngle(azimuth) / 45) % 8;
    return directions[index];
}

/**
 * Formats a date to German locale string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 * @example
 * formatDate(new Date()) // returns "07.07.2025 15:30:45"
 */
function formatDate(date) {
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Shows a Bootstrap modal with a message
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} [type='info'] - Modal type (info, warning, error, success)
 * @example
 * showModal('Fehler', 'Bitte alle Felder ausfüllen', 'error');
 */
function showModal(title, message, type = 'info') {
    const modal = document.getElementById('infoModal');
    if (!modal) {
        console.warn('Info modal not found, using console log');
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        return;
    }
    
    const modalTitle = document.getElementById('infoModalLabel') || document.getElementById('infoModalTitle');
    const modalBody = document.getElementById('infoModalBody');
    
    if (!modalTitle || !modalBody) {
        console.warn('Modal elements not found, using console log');
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        return;
    }
    
    const modalHeader = modal.querySelector('.modal-header');
    if (modalHeader) {
        // Remove all type classes
        modalHeader.classList.remove('bg-danger', 'bg-warning', 'bg-info', 'bg-success', 'text-white');
        
        // Add appropriate class based on type
        switch(type) {
            case 'error':
                modalHeader.classList.add('bg-danger', 'text-white');
                break;
            case 'warning':
                modalHeader.classList.add('bg-warning');
                break;
            case 'success':
                modalHeader.classList.add('bg-success', 'text-white');
                break;
            default:
                modalHeader.classList.add('bg-info', 'text-white');
        }
    }
    
    modalTitle.textContent = title;
    modalBody.innerHTML = message;
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Closes all open Bootstrap modals
 * @example
 * closeAllModals();
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseGermanNumber,
        formatGermanNumber,
        generateId,
        degreesToRadians,
        radiansToDegrees,
        normalizeAngle,
        calculateDistance,
        deepClone,
        debounce,
        isValidNumber,
        getCompassDirection,
        formatDate,
        showModal,
        closeAllModals
    };
}