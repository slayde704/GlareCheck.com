/**
 * Search Manager
 * Handles address and coordinate search with Google Places Autocomplete
 */

import { MapManager } from '../core/map-manager.js';
import { UIManager } from './ui-manager.js';

// i18n helper
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;

export const SearchManager = {
    autocomplete: null,
    searchInput: null,

    /**
     * Initialize search functionality
     */
    initialize() {
        this.searchInput = document.getElementById('address-search');

        if (!this.searchInput) {
            console.warn('Search input not found');
            return;
        }

        // Set up autocomplete when Google Maps is ready
        if (window.google && window.google.maps && window.google.maps.places) {
            this.setupAutocomplete();
        } else {
            // Wait for Google Maps to load
            const checkGoogle = setInterval(() => {
                if (window.google && window.google.maps && window.google.maps.places) {
                    clearInterval(checkGoogle);
                    this.setupAutocomplete();
                }
            }, 100);
        }

        // Enter key handler
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });

        // Subscribe to language changes to update placeholder and autocomplete
        if (window.i18n) {
            window.i18n.subscribe(() => {
                this.updatePlaceholder();
                this.updateAutocompleteLanguage();
            });
        }

        // Set initial placeholder
        this.updatePlaceholder();
    },

    /**
     * Set up Google Places Autocomplete
     */
    setupAutocomplete() {
        try {
            // Get current language from i18n
            const currentLang = window.i18n ? window.i18n.getLanguage() : 'de';

            this.autocomplete = new google.maps.places.Autocomplete(this.searchInput, {
                types: ['geocode'],
                fields: ['geometry', 'formatted_address', 'name'],
                language: currentLang
            });

            // Listen for place selection
            this.autocomplete.addListener('place_changed', () => {
                const place = this.autocomplete.getPlace();

                if (!place.geometry) {
                    UIManager.showNotification(t('search.noResults'), 'warning');
                    return;
                }

                this.navigateToLocation(
                    place.geometry.location.lat(),
                    place.geometry.location.lng(),
                    place.formatted_address || place.name
                );
            });

            console.log('Autocomplete initialized with language:', currentLang);
        } catch (error) {
            console.error('Error setting up autocomplete:', error);
        }
    },

    /**
     * Update autocomplete language when language changes
     */
    updateAutocompleteLanguage() {
        if (this.autocomplete) {
            // Remove old autocomplete
            google.maps.event.clearInstanceListeners(this.searchInput);

            // Re-setup with new language
            this.setupAutocomplete();
        }
    },

    /**
     * Update placeholder text based on current language
     */
    updatePlaceholder() {
        if (this.searchInput) {
            this.searchInput.placeholder = t('search.placeholder');
        }
    },

    /**
     * Perform search (address or coordinates)
     */
    search() {
        const query = this.searchInput.value.trim();

        if (!query) {
            return;
        }

        // Check if input looks like coordinates
        if (this.isCoordinateInput(query)) {
            this.searchCoordinates(query);
        } else {
            this.searchAddress(query);
        }
    },

    /**
     * Check if input is coordinate format
     */
    isCoordinateInput(query) {
        // Match patterns like:
        // 48.1351, 11.5820
        // 48.1351 11.5820
        // 48° 8' 6.36" N, 11° 34' 55.20" E
        const coordPattern = /^[-+]?\d+\.?\d*[\s,]+[-+]?\d+\.?\d*$/;
        const dmsPattern = /\d+°\s*\d+'?\s*[\d.]+"?\s*[NS][\s,]+\d+°\s*\d+'?\s*[\d.]+"?\s*[EW]/i;

        return coordPattern.test(query) || dmsPattern.test(query);
    },

    /**
     * Search for coordinates
     */
    searchCoordinates(query) {
        try {
            // Parse coordinates
            const coords = this.parseCoordinates(query);

            if (!coords) {
                UIManager.showNotification(t('search.invalidCoordinates'), 'error');
                return;
            }

            // Validate coordinate ranges
            if (Math.abs(coords.lat) > 90 || Math.abs(coords.lng) > 180) {
                UIManager.showNotification(t('search.invalidCoordinates'), 'error');
                return;
            }

            this.navigateToLocation(coords.lat, coords.lng, `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        } catch (error) {
            console.error('Error parsing coordinates:', error);
            UIManager.showNotification(t('search.error'), 'error');
        }
    },

    /**
     * Parse coordinate string
     */
    parseCoordinates(query) {
        // Remove extra whitespace
        query = query.trim();

        // Try simple decimal format first (48.1351, 11.5820 or 48.1351 11.5820)
        const parts = query.split(/[\s,]+/);

        if (parts.length >= 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);

            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }

        // TODO: Add DMS (Degrees, Minutes, Seconds) parsing if needed

        return null;
    },

    /**
     * Search for address using Google Geocoding
     */
    searchAddress(query) {
        if (!window.google || !window.google.maps) {
            UIManager.showNotification(t('search.error'), 'error');
            return;
        }

        const geocoder = new google.maps.Geocoder();
        const currentLang = window.i18n ? window.i18n.getLanguage() : 'de';

        UIManager.showNotification(t('search.searching'), 'info');

        geocoder.geocode({
            address: query,
            language: currentLang
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                this.navigateToLocation(
                    location.lat(),
                    location.lng(),
                    results[0].formatted_address
                );
            } else {
                UIManager.showNotification(t('search.noResults'), 'warning');
            }
        });
    },

    /**
     * Navigate to location on map
     */
    navigateToLocation(lat, lng, description) {
        const map = MapManager.getMap();

        if (!map) {
            console.error('Map not available');
            return;
        }

        // Create location object
        const location = new google.maps.LatLng(lat, lng);

        // Center and zoom map
        map.setCenter(location);
        map.setZoom(18);

        // Add temporary marker
        const marker = new google.maps.Marker({
            position: location,
            map: map,
            animation: google.maps.Animation.DROP,
            title: description
        });

        // Show info window
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 5px;"><strong>${description}</strong><br>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</div>`
        });

        infoWindow.open(map, marker);

        // Remove marker after 5 seconds
        setTimeout(() => {
            marker.setMap(null);
            infoWindow.close();
        }, 5000);

        UIManager.showNotification(t('search.locationFound'), 'success');

        // Clear search input
        this.searchInput.value = '';
    }
};

// Make globally available
window.SearchManager = SearchManager;

// Export for ES6 modules
export default SearchManager;
